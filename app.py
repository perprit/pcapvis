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
def hello():
    return render_template('tcp_json_view.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload_pcap():
    if request.method == 'POST':
        fp = request.files['file']
        if fp and allowed_file(fp.filename):
            filename = secure_filename(fp.filename)
            fp.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            return redirect(url_for('uploaded_file', filename=filename))
    return '''
    <!doctype html>
    <title>Upload new File</title>
    <h1>Upload new File</h1>
    <form action="" method=post enctype=multipart/form-data>
        <p>
            <input type=file name=file>
            <input type=submit value=Upload>
    </form>
    '''

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'r') as fp:
        json = pcap_to_json(fp)
    return json

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=12321)
