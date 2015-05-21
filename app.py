import os
from flask import Flask, request, redirect, url_for, send_from_directory, render_template, jsonify
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
    if 'filename' in request.args.keys():
        filename = request.args['filename']
    else:
        filename = "File Not Uploaded"

    return render_template('layout.html', filename=filename)

@app.route('/upload', methods=['GET', 'POST'])
def upload_pcap():
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
            return tcp_json
    return None

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
