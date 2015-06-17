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
                sort_sd = lambda p: ','.join(sorted([str(p['src'])+":"+str(p['sport']), str(p['dst'])+":"+str(p['dport'])]))
                for p in tcp_json_loads:
                    ip_as_key[sort_sd(p)].append([p['ts'], p['flags']])
                for i, p in enumerate(tcp_json_loads):
                    tcp_json_loads[i]['latency'] = calLatency(p['ts'], sort_sd(p))
            return json.dumps(tcp_json_loads)
    return None

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

@app.route('/setData', methods=['POST'])
def setData():
    global tcp_json_loads

    if request.method == 'POST' and bool(tcp_json_loads):
        req = request.get_json()
        extent_initial = req['extent_initial']
        ext = req['ext'] if 'ext' in req.keys() else extent_initial
        binNum = req['binNum']
        binSize = req['binSize']
        b_filter_ext = map(float, req['b_filter_ext'])
        l_filter_ext = map(float, req['l_filter_ext'])

        ret = {'freq': [0 for _ in xrange(binNum)], 'latency' : [0 for _ in xrange(binNum)], 'b_ip_list': {}, 'l_ip_list': {}}

        insiders = [d for d in tcp_json_loads if not(d["ts"] - extent_initial[0] > ext[1] or d["ts"] - extent_initial[0] < ext[0])]
        insiders = [d for d in insiders if d['latency'] >= l_filter_ext[0] and d['latency'] <= l_filter_ext[1]]
        insiders = [d for d in insiders if d['datalen'] >= b_filter_ext[0] and d['datalen'] <= b_filter_ext[1]]

        for d in insiders:
            idx = int(math.floor((d["ts"]-extent_initial[0]-ext[0])/binSize))
            idx = idx-1 if idx == binNum else idx

            ret['freq'][idx] += d['datalen']
            ret['latency'][idx] += d['latency']
            
            src = str(d['src'])+":"+str(d['sport'])
            dst = str(d['dst'])+":"+str(d['dport'])

            ret['b_ip_list'].setdefault(src, {})
            ret['b_ip_list'][src].setdefault(dst, 0)
            ret['l_ip_list'].setdefault(src, {})
            ret['l_ip_list'][src].setdefault(dst, 0)

            ret['b_ip_list'][src][dst] += d['datalen']
            ret['l_ip_list'][src][dst] += d['latency']

        return json.dumps(ret)
    return


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
