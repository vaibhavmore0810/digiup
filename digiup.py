from flask import Flask, render_template, send_file, redirect, request, send_from_directory, url_for, abort, make_response, flash
from werkzeug.utils import secure_filename
from werkzeug.serving import run_simple
import os
import signal
import zipfile
import os
from PIL import Image
from io import BytesIO
from utils.path import is_valid_subpath, is_valid_upload_path, get_parent_directory, process_files
from utils.output import error, success

app = Flask(__name__)
app.secret_key = '69db287b85770e666b06755315ba7a77'
global base_directory
base_directory = ""

def read_write_directory(directory):
    if os.path.exists(directory):
        if os.access(directory, os.W_OK and os.R_OK):
            return directory
        else:
            error('The output is not readable and/or writable')
    else:
        error('The specified directory does not exist')

# Set the base_directory directly (you can replace 'your_directory_here' with your directory path)
base_directory = os.getcwd()

@app.route('/view', methods=['GET'])
def view_file():
    path = request.args.get('path')

    if not path:
        abort(400, "Missing 'path' parameter")

    if not os.path.isfile(path):
        abort(404, f"File not found: {path}")

    _, extension = os.path.splitext(path.lower())

    # Check if the file is an image
    if extension in {'.png', '.jpg', '.jpeg', '.gif'}:
        # Open the image using PIL
        try:
            img = Image.open(path)
        except Exception as e:
            abort(500, f"Failed to open image: {str(e)}")

        # Convert image to bytes
        img_byte_array = BytesIO()
        img.save(img_byte_array, format=img.format)
        img_byte_array.seek(0)

        # Render the image in the browser
        response = make_response(img_byte_array.read())
        response.headers['Content-Type'] = f'image/{img.format.lower()}'
        return response
    else:
        # For non-image files, serve the file
        return send_file(path)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'images/favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/', defaults={'path': None})
@app.route('/<path:path>')
def home(path):
    if path and is_valid_subpath(path, base_directory):
        path = os.path.normpath(path)
        requested_path = os.path.join(base_directory, path)

        if os.path.isdir(requested_path):
            back = get_parent_directory(requested_path, base_directory)
            is_subdirectory = True
        elif os.path.isfile(requested_path):
            if request.args.get('view') is None:
                send_as_attachment = True
            else:
                send_as_attachment = False

            (filename, extension) = os.path.splitext(requested_path)
            if extension == '':
                mimetype = 'text/plain'
            else:
                mimetype = None

            try:
                return send_file(requested_path, mimetype=mimetype, as_attachment=send_as_attachment)
            except PermissionError:
                abort(403, 'Read Permission Denied: ' + requested_path)
    else:
        is_subdirectory = False
        requested_path = base_directory
        back = ''

    if os.path.exists(requested_path):
        try:
            directory_files = process_files(os.scandir(requested_path), base_directory)
        except PermissionError:
            abort(403, 'Read Permission Denied: ' + requested_path)

        return render_template('home.html', files=directory_files, back=back, directory=requested_path, is_subdirectory=is_subdirectory)
    else:
        return redirect('/')
    

@app.route('/create_folder', methods=['POST'])
def create_folder():
    if request.method == 'POST':
        folder_name = request.form['folder_name']  # Get the folder name from the form

        # Combine the folder name with the current path to create the full folder path
        folder_path = os.path.join(request.form['path'], folder_name)

        # Check if the folder already exists
        if os.path.exists(folder_path):
            flash(f'Folder "{folder_name}" already exists', 'danger')  # Display a flash message
        else:
            try:
                os.makedirs(folder_path)  # Create the new folder
                flash(f'Folder "{folder_name}" created successfully', 'success')  # Display a success message
            except Exception as e:
                flash(f'Error creating folder: {str(e)}', 'danger')  # Display an error message

    return redirect(request.referrer)


@app.route('/upload', methods=['POST'])
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            return redirect(request.referrer)

        path = request.form['path']
        if not is_valid_upload_path(path, base_directory):
            return redirect(request.referrer)

        for file in request.files.getlist('file'):
            if file.filename == '':
                return redirect(request.referrer)

            if file:
                filename = secure_filename(file.filename)
                full_path = os.path.join(path, filename)
                try:
                    file.save(full_path)
                except PermissionError:
                    abort(403, 'Write Permission Denied: ' + full_path)

        return redirect(request.referrer)

@app.route('/download', methods=['POST', 'GET'])
def download():
    path = request.args.get('path')
    print(path)


    if not path:
        abort(400, "Missing 'path' parameter")

    if not os.path.isdir(path):
        abort(404, f"Directory not found: {path}")

    folder_name = os.path.basename(path)  # Extract folder name from the path
    zip_filename = f'{folder_name}.zip'  # Use folder name as the zip file name

    print(zip_filename)

    try:
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, path)
                    zipf.write(file_path, arcname=arcname)

        response = make_response(send_from_directory('', zip_filename, as_attachment=True))
        response.headers["Content-Disposition"] = f"attachment; filename={zip_filename}"
        response.headers["X-Folder-Name"] = folder_name
        return response

    except Exception as e:
        abort(500, f"Failed to create ZIP file: {str(e)}")

success('Serving {}...'.format(base_directory))

def handler(signal, frame):
    print()
    error('Exiting!')
signal.signal(signal.SIGINT, handler)

if __name__ == '__main__':
    run_simple("0.0.0.0", 9090, app, True)
