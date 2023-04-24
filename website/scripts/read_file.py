import json
import os

ASSETS_PATH = "../assets"
JSON_PATH = "../data/svgs.json"

# Read all file names in directory "assets"
# and return a list of file names
def read_file():
    file_list = []
    for filename in os.listdir(ASSETS_PATH):
        file_list.append("/assets/" + filename)
    return file_list

if __name__ == "__main__":
    files = read_file()
    # Write the name of the files in a JSON file
    files = {"files": files}
    json.dump(files, open(JSON_PATH, "w"), indent=4)