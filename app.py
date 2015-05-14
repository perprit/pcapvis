import os
from flask import Flask, request, redirect, url_for, send_from_directory, render_template
from werkzeug import secure_filename
from pcap_parser import pcap_to_json 

UPLOAD_FOLDER = 'uploaded_pcap'
ALLOWED_EXTENSIONS = set(['pcap'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    if 'tcp_json' in request.args.keys():
        tcp_json = request.args['tcp_json']
    else:
        tcp_json = {}
    return render_template('tcp_json_view.html', tcp_json=tcp_json)

@app.route('/upload', methods=['GET', 'POST'])
def upload_pcap():
    if request.method == 'POST':
        fp = request.files['file']
        if fp and allowed_file(fp.filename):
            filename = secure_filename(fp.filename)
            fp.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            return redirect(url_for('uploaded_file', filename=filename))
    return redirect(url_for('index'))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'r') as fp:
        tcp_json = pcap_to_json(fp)
    return redirect(url_for('index', tcp_json=tcp_json))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
