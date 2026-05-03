import os
import zipfile

def create_zip():
    zipf = zipfile.ZipFile('backend.zip', 'w', zipfile.ZIP_DEFLATED)
    for root, dirs, files in os.walk('.'):
        if '.venv' in root or '__pycache__' in root:
            continue
        for file in files:
            if file in ['db.sqlite3', 'backend.zip', 'zip_backend.py', '.azureignore']:
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.').replace('\\', '/')
            zipf.write(file_path, arcname)
    zipf.close()

if __name__ == '__main__':
    create_zip()
