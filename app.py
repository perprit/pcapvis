import os
import math, json
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
            return tcp_json
    return None

@app.route('/setData', methods=['POST'])
def setData():
    global tcp_json_loads

    if request.method == 'POST' and bool(tcp_json_loads):
        req = request.get_json()
        extent_initial = req['extent_initial']
        if 'ext' in req.keys():
            ext = req['ext']
        else:
            ext = extent_initial
        binNum = req['binNum']
        binSize = req['binSize']

        ret = {'freq': [0]*binNum, 'ip_list': {}}
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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
