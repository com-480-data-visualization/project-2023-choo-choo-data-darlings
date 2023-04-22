import os
import requests

BAV_SRC_PATH = "https://opentransportdata.swiss/dataset/b9d607ba-4ff5-43a6-ac83-293f454df1fd/resource/9fa965a0-b152-42c5-b1d1-839731e8500b/download/bav_list_current_timetable.xlsx"
BAV_DST_PATH = "../../data/bav_list_current_timetable.xlsx"

def download_bav_data(overwrite_existing_file=False):
    """
    Download BAV data.
    
    Args:
        overwrite (bool): Overwrite existing file

    Returns:
        str: Path to the downloaded file
    """
    if os.path.exists(BAV_DST_PATH):
        if overwrite_existing_file:
            os.remove(BAV_DST_PATH)
        else:
            return BAV_DST_PATH
    
    data = requests.get(BAV_SRC_PATH)
    with open(BAV_DST_PATH, 'wb') as file:
        file.write(data.content)

    return BAV_DST_PATH