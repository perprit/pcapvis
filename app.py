import os, math, json
from collections import defaultdict
from flask import Flask, request, redirect, url_for, send_from_directory, render_template, jsonify
from werkzeug import secure_filename
from pcap_parser import pcap_to_json 

UPLOAD_FOLDER = 'uploaded_pcap'
ALLOWED_EXTENSIONS = set(['pcap'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
tcp_json_loads = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    if 'filename' in request.args.keys():
        filename = request.args['filename']
    else:
        filename = "File Not Uploaded"

    return render_template('layout.html', filename=filename)

@app.route('/upload', methods=['GET', 'POST'])
def upload_pcap():
    global tcp_json_loads
    global ip_as_key
    if request.method == 'POST':
        fp = request.files['file']
        # if UPLOAD_FOLDER directory does not exist, create it
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])
        # uploading the PCAP file
        if fp and allowed_file(fp.filename):
            filename = secure_filename(fp.filename)
            fp.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'rb') as fp:
                tcp_json = pcap_to_json(fp)
                tcp_json_loads = json.loads(tcp_json)
                ip_as_key = defaultdict(list)
                for p in tcp_json_loads:
                    src = str(p['src'])+":"+str(p['sport'])
                    dst = str(p['dst'])+":"+str(p['dport'])
                    sd = [src, dst]
                    sd.sort()
                    ip_as_key[sd[0] + ',' + sd[1]].append([p['ts'], p['flags']])
            return tcp_json
    return None


@app.route('/setData', methods=['POST'])
def setData():
    global tcp_json_loads

    if request.method == 'POST' and bool(tcp_json_loads):
        req = request.get_json()
        extent_initial = req['extent_initial']
        ext = req['ext'] if 'ext' in req.keys() else extent_initial
        binNum = req['binNum']
        binSize = req['binSize']

        ret = {'freq': [0 for _ in xrange(binNum)], 'ip_list': {}}
        insiders = [d for d in tcp_json_loads if not(d["ts"] - extent_initial[0] > ext[1] or d["ts"] - extent_initial[0] < ext[0])]
        for d in insiders:
            idx = int(math.floor((d["ts"]-extent_initial[0]-ext[0])/binSize))
            if idx == binNum:
                idx-=1
            ret['freq'][idx] += d['datalen']
            
            src = str(d['src'])+":"+str(d['sport'])
            dst = str(d['dst'])+":"+str(d['dport'])

            if not src in ret['ip_list']:
                ret['ip_list'][src] = {}
            if not dst in ret['ip_list'][src]:
                ret['ip_list'][src][dst] = 0
            ret['ip_list'][src][dst] += d['datalen']
        if 'filter_ext' in req.keys():
            filter_ext = req['filter_ext']
            if filter_ext[0] == u'' and filter_ext[1] == u'':
                pass
            else:
                filter_ext = [float(f) for f in req['filter_ext']]
                ret['freq'] = [f if f >= filter_ext[0] and f <= filter_ext[1] else 0 for f in ret['freq']]
        return json.dumps(ret)
    return


def calLatency(ts, ip_key):
    global ip_as_key
    tss = [t for t in ip_as_key[ip_key] if t[0] >= ts]
    if tss[0][1]['SYN'] == True and tss[0][1]['ACK'] == False:
        _tss = [t for t in tss if t[1]['SYN'] == True and t[1]['ACK'] == True]
        if _tss == []:
            return 0
        else:
            return _tss[0][0] - tss[0][0]
    elif tss[0][1]['SYN'] == True and tss[0][1]['ACK'] == True:
        _tss = [t for t in tss if t[1]['SYN'] == True and t[1]['ACK'] == False]
        if _tss == []:
            return 0
        else:
            return _tss[0][0] - tss[0][0]
    elif tss[0][1]['FIN'] == True:
        _tss = [t for t in tss if t[1]['ACK'] == True]
        if _tss == []:
            return 0
        else:
            return _tss[0][0] - tss[0][0]
    else:
        return 0


# returns setData style json representing Latency
# unit : second
@app.route('/setLatency', methods=['POST'])
def setLatency():
    global tcp_json_loads

    if request.method == 'POST' and bool(tcp_json_loads):
        req = request.get_json()
        extent_initial = req['extent_initial']
        ext = req['ext'] if 'ext' in req.keys() else extent_initial
        binNum = req['binNum']
        binSize = req['binSize']

        ret = {'latency': [0 for _ in xrange(binNum)], 'ip_list': {}}
        insiders = [d for d in tcp_json_loads if not(d["ts"] - extent_initial[0] > ext[1] or d["ts"] - extent_initial[0] < ext[0])]

        for d in insiders:
            idx = int(math.floor((d['ts']-extent_initial[0]-ext[0])/binSize))
            if idx == binNum:
                idx -= 1
            src = str(d['src'])+":"+str(d['sport'])
            dst = str(d['dst'])+":"+str(d['dport'])
            sd = [src, dst]
            sd.sort()
            lat = calLatency(d['ts'], sd[0] + ',' + sd[1])
            ret['latency'][idx] += lat

            if not src in ret['ip_list']:
                ret['ip_list'][src] = {}
            if not dst in ret['ip_list'][src]:
                ret['ip_list'][src][dst] = 0
            ret['ip_list'][src][dst] += lat
        if 'filter_ext' in req.keys():
            filter_ext = req['filter_ext']
            if filter_ext[0] == u'' and filter_ext[1] == u'':
                pass
            else:
                filter_ext = [float(f) for f in req['filter_ext']]
                ret['latency'] = [f if f >= filter_ext[0] and f <= filter_ext[1] else 0 for f in ret['latency']]
        return json.dumps(ret)
    return




if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
