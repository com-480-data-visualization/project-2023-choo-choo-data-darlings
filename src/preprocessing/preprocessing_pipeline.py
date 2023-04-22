import os
import holidays
import regex as re
import numpy as np
import pandas as pd
from datetime import datetime
from preprocessing.download_data import download_bav_data


def __get_stop_data_dst_path(day_str):
    return f'../../data/processed/{day_str}_stops.csv'

def __get_operator_data_dst_path(day_str):
    return f'../../data/processed/{day_str}_operators.csv'

def __get_cleaned_data_dst_path(day_str):
    return f'../../data/processed/{day_str}_istdaten_cleaned.parquet'

def __get_data_from_file_name(
        file_name,
        sep=';',
        parse_dates=[
            'BETRIEBSTAG', 
            'ANKUNFTSZEIT', 
            'AN_PROGNOSE', 
            'ABFAHRTSZEIT', 
            'AB_PROGNOSE'
        ],
        dtype={
            'FAHRT_BEZEICHNER': 'string',
            'BETRIEBER_ID': 'string',
            'BETREIBER_ABK': 'string',
            'BETREIBER_NAME': 'string',
            'PRODUKT_ID': 'category',
            'LINIEN_ID': 'string',
            'LINIEN_TEXT': 'string',
            'UMLAUF_ID': 'string',
            'VERKEHRSMITTEL_TEXT': 'string',
            'ZUSATZFAHRT_TF': 'boolean',
            'FAELLT_AUS_TF': 'boolean',
            'BPUIC': 'int',
            'HALTESTELLEN_NAME': 'string',
            'AN_PROGNOSE_STATUS': 'category',
            'AB_PROGNOSE_STATUS': 'category',
            'DURCHFAHRT_TF': 'boolean'
        },
        overwrite_existing_file=False
):
    """
    Get data from a specific day.
    
    Args:
        file_name (str): Path to the file
        sep (str): Separator of the file
        parse_dates (list): List of columns to parse as dates
        dtype (dict): Dictionary with the data types of the columns
        overwrite_existing_file (bool): Overwrite existing file
    
    Returns:
        pd.DataFrame: Dataframe with the data from the day
    """
    transport_data = pd.read_csv(
        file_name,
        sep=sep,
        parse_dates=parse_dates,
        dtype=dtype,
        dayfirst=True
    )

    return transport_data

def __translate_columns(transport_data):
    """
    Translate the column names to english.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
        
    Returns:
        pd.DataFrame: Dataframe with the translated column names
    """
    new_transport_data = transport_data.copy()
    translations = {
        'BETRIEBSTAG': 'date',
        'FAHRT_BEZEICHNER': 'trip_id',
        'BETREIBER_ID': 'operator_id',
        'BETREIBER_ABK': 'operator_abbreviation',
        'BETREIBER_NAME': 'operator_name',
        'PRODUKT_ID': 'product_id',
        'LINIEN_ID': 'line_id',
        'LINIEN_TEXT': 'line_text',
        'UMLAUF_ID': 'circuit_id',
        'VERKEHRSMITTEL_TEXT': 'transport_type',
        'ZUSATZFAHRT_TF': 'is_additional_trip',
        'FAELLT_AUS_TF': 'is_cancelled',
        'BPUIC': 'stop_id',
        'HALTESTELLEN_NAME': 'stop_name',
        'ANKUNFTSZEIT': 'arrival_time',
        'AN_PROGNOSE': 'arrival_forecast',
        'AN_PROGNOSE_STATUS': 'arrival_forecast_status',
        'ABFAHRTSZEIT': 'departure_time',
        'AB_PROGNOSE': 'departure_forecast',
        'AB_PROGNOSE_STATUS': 'departure_forecast_status',
        'DURCHFAHRT_TF': 'is_through_trip'
    }
    new_transport_data = new_transport_data.rename(columns=translations)

    return new_transport_data

def __process_product_id(transport_data):
    """
    Process the product_id column.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
    
    Returns:
        pd.DataFrame: Dataframe with the processed product_id column
    """
    new_transport_data = transport_data.copy()
    # Remove rows with missing values in product_id
    new_transport_data = new_transport_data[new_transport_data['product_id'].notna()]

    # Merge Bus and BUS into Bus
    new_transport_data['product_id'] = new_transport_data['product_id'].str.replace('BUS', 'Bus')

    # Translate product_id
    new_transport_data['product_id'] = new_transport_data['product_id'].replace({
        'Zahnradbahn': 'Rack_railway',
        'Schiff': 'Boat',
        'Zug': 'Train',
    })

    return new_transport_data

def __process_transport_type(transport_data):
    """
    Process the transport_type column.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
    
    Returns:
        pd.DataFrame: Dataframe with the processed transport_type column
    """
    new_transport_data = transport_data.copy()
    # Remove rows with missing values in product_id
    new_transport_data = new_transport_data[new_transport_data['transport_type'].notna()]

    # Merge B, BN and Bus into B
    new_transport_data['transport_type'] = new_transport_data['transport_type'].str.replace('BN', 'B')
    new_transport_data['transport_type'] = new_transport_data['transport_type'].str.replace('Bus', 'B')

    # Merge T and TN into T
    new_transport_data['transport_type'] = new_transport_data['transport_type'].str.replace('TN', 'T')

    # Merge S and SN into S
    new_transport_data['transport_type'] = new_transport_data['transport_type'].str.replace('SN', 'S')

    # Rename Zug to Z
    new_transport_data['transport_type'] = new_transport_data['transport_type'].str.replace('Zug', 'Z')

    return new_transport_data

def __get_bav_data(
        skiprows=[0, 1, 3],
        usecols=[0, 4, 23, 24],
        overwrite_existing_file=False
):
    """
    Get data from BAV.
    
    Args:
        skiprows (list, optional): Rows to skip. Defaults to [0, 1, 3].
        usecols (list, optional): Columns to use. Defaults to [0, 4, 23, 24].
        overwrite_existing_file (bool, optional): Overwrite existing file. Defaults to False.

    Returns:
        pd.DataFrame: Dataframe with the data from BAV
    """
    dst_path = download_bav_data(overwrite_existing_file=overwrite_existing_file)
    bav_data = pd.read_excel(dst_path, skiprows=skiprows, usecols=usecols)

    # Rename columns
    bav_data = bav_data.rename(columns= {
        'Dienststellen-\nNummer siebenstellig': 'stop_id',
        'Name \n(Dst-Bezeichnung)': 'stop_name',
        'E-Koordinate': 'stop_lon',
        'N-Koordinate': 'stop_lat'
    })

    # Delete rows with missing values
    bav_data = bav_data[bav_data['stop_id'].notna()]

    # Convert columns to correct data types
    bav_data['stop_id'] = bav_data['stop_id'].astype('int')
    bav_data['stop_name'] = bav_data['stop_name'].astype('string')
    bav_data['stop_lon'] = bav_data['stop_lon'].astype('int')
    bav_data['stop_lat'] = bav_data['stop_lat'].astype('int')

    return bav_data

def __process_stop(transport_data, bav_data):
    """
    Process the stops.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
    
    Returns:
        pd.DataFrame: Dataframe with the processed stops
    """
    new_transport_data = transport_data.copy()
    # Merge transport_data and bav_data
    new_transport_data = new_transport_data.merge(bav_data, left_on='stop_id', right_on='stop_id', how='left')

    # Get name from BAV if missing in transport_data
    new_transport_data['stop_name'] = new_transport_data['stop_name_x'].fillna(new_transport_data['stop_name_y'])
    new_transport_data = new_transport_data.drop(columns=['stop_name_x', 'stop_name_y'])

    # Delete rows where coordinates of stop are missing
    new_transport_data = new_transport_data[new_transport_data['stop_lon'].notna()]
    new_transport_data = new_transport_data[new_transport_data['stop_lat'].notna()]

    return new_transport_data

def __extract_stop_data(
        transport_data, 
        day_str, 
        overwrite_existing_file=False
):
    """
    Extract the stop data from the transport data and save it to a csv file.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
        day_str (str): Date of the data
        overwrite_existing_file (bool, optional): Overwrite existing file. Defaults to False.
    """
    stop_data_dst_path = __get_stop_data_dst_path(day_str)
    if os.path.exists(stop_data_dst_path):
        if overwrite_existing_file:
            os.remove(stop_data_dst_path)
        else:
            return
        
    transport_data[['stop_id', 'stop_name', 'stop_lon', 'stop_lat']] \
        .set_index('stop_id') \
        .drop_duplicates() \
        .to_csv(stop_data_dst_path)
        

def __process_arrival(transport_data):
    """
    Process the arrival columns.
    
    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
        
    Returns:
        pd.DataFrame: Dataframe with the processed arrival columns
    """
    new_transport_data = transport_data.copy()
    # Translate arrival_forecast_status
    new_transport_data['arrival_forecast_status'] = new_transport_data['arrival_forecast_status'].replace({
        'PROGNOSE': 'FORECAST',
        'UNBEKANNT': 'UNKNOWN',
        'REAL': 'REAL',
        'GESCHAETZT': 'ESTIMATED',
    })

    # Set arrival_forecast and arrival_forecast_status to Na if arrival_time is NaT
    new_transport_data.loc[new_transport_data['arrival_time'].isna(), 'arrival_forecast'] = pd.NaT
    new_transport_data.loc[new_transport_data['arrival_time'].isna(), 'arrival_forecast_status'] = np.nan

    # Set arrival_forecast and arrival_forecast_status to Na if arrival_forecast_status is UNKNOWN
    new_transport_data.loc[new_transport_data['arrival_forecast_status'] == 'UNKNOWN', 'arrival_forecast'] = pd.NaT
    new_transport_data.loc[new_transport_data['arrival_forecast_status'] == 'UNKNOWN', 'arrival_forecast_status'] = np.nan
    new_transport_data['arrival_forecast_status'] = new_transport_data['arrival_forecast_status'].cat.remove_unused_categories()

    # Set arrival_forecast_status to Na if arrival_forecast is NaT
    new_transport_data.loc[new_transport_data['arrival_forecast'].isna(), 'arrival_forecast_status'] = np.nan

    # Set arrival_forecast_status to 'FORECAST' if it is Na and arrival_forecast is not NaT
    new_transport_data.loc[new_transport_data['arrival_forecast_status'].isna() & new_transport_data['arrival_forecast'].notna(), 'arrival_forecast_status'] = 'FORECAST'

    return new_transport_data

def __process_departure(transport_data):
    """
    Process the departure columns.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day

    Returns:
        pd.DataFrame: Dataframe with the processed departure columns
    """
    new_transport_data = transport_data.copy()
    # Translate departure_forecast_status
    new_transport_data['departure_forecast_status'] = new_transport_data['departure_forecast_status'].replace({
        'PROGNOSE': 'FORECAST',
        'UNBEKANNT': 'UNKNOWN',
        'REAL': 'REAL',
        'GESCHAETZT': 'ESTIMATED',
    })
    
    # Set departure_forecast and departure_forecast_status to Na if departure_time is NaT
    new_transport_data.loc[new_transport_data['departure_time'].isna(), 'departure_forecast'] = pd.NaT
    new_transport_data.loc[new_transport_data['departure_time'].isna(), 'departure_forecast_status'] = np.nan

    # Set departure_forecast and departure_forecast_status to Na if departure_forecast_status is UNKNOWN
    new_transport_data.loc[new_transport_data['departure_forecast_status'] == 'UNKNOWN', 'departure_forecast'] = pd.NaT
    new_transport_data.loc[new_transport_data['departure_forecast_status'] == 'UNKNOWN', 'departure_forecast_status'] = np.nan
    new_transport_data['departure_forecast_status'] = new_transport_data['departure_forecast_status'].cat.remove_unused_categories()

    # Set departure_forecast_status to Na if departure_forecast is NaT
    new_transport_data.loc[new_transport_data['departure_forecast'].isna(), 'departure_forecast_status'] = np.nan

    # Set departure_forecast_status to 'FORECAST' if it is Na and departure_forecast is not NaT
    new_transport_data.loc[new_transport_data['departure_forecast_status'].isna() & new_transport_data['departure_forecast'].notna(), 'departure_forecast_status'] = 'FORECAST'

    return new_transport_data

def __handle_inconsistent_rows(
        transport_data,
        early_thd = 60,
        late_thd = 480,
    ):
    """
    Handle inconsistent rows.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day

    Returns:
        pd.DataFrame: Dataframe with the processed rows
    """
    new_transport_data = transport_data.copy()
    # Delete rows where both arrival_time and departure_time are missing, for completeness
    new_transport_data = new_transport_data[(new_transport_data['arrival_time'].notna()) | (new_transport_data['departure_time'].notna())]

    # Delete duplicates when not taking into account arrival_forecast, arrival_forecast_status, departure_forecast, departure_forecast_status
    columns_to_compare = new_transport_data.columns.difference(['arrival_forecast', 'arrival_forecast_status', 'departure_forecast', 'departure_forecast_status'])
    duplicates = new_transport_data.duplicated(subset=columns_to_compare, keep='first')
    new_transport_data = new_transport_data[~duplicates]

    # For entries where the arrival_forecast happens after the departure_forecast, we replace the arrival_forecast with the departure_forecast value.
    is_time_inconsistent = (
        new_transport_data['arrival_forecast'].notna()
        & new_transport_data['departure_forecast'].notna()
        & (new_transport_data['arrival_forecast'] > new_transport_data['departure_forecast'])
    )
    new_transport_data.loc[is_time_inconsistent, 'arrival_forecast'] = new_transport_data['departure_forecast']
    
    # Set arrival_forecast to NaT and arrival_forecast_status to Na if the forecast is too early
    new_transport_data.loc[new_transport_data['arrival_forecast'] < new_transport_data['arrival_time'] - pd.Timedelta(minutes=early_thd), 'arrival_forecast_status'] = np.nan
    new_transport_data.loc[new_transport_data['arrival_forecast'] < new_transport_data['arrival_time'] - pd.Timedelta(minutes=early_thd), 'arrival_forecast'] = pd.NaT

    # Set departure_forecast to NaT and departure_forecast_status to Na if the forecast is too early
    new_transport_data.loc[new_transport_data['departure_forecast'] < new_transport_data['departure_time'] - pd.Timedelta(minutes=early_thd), 'departure_forecast_status'] = np.nan
    new_transport_data.loc[new_transport_data['departure_forecast'] < new_transport_data['departure_time'] - pd.Timedelta(minutes=early_thd), 'departure_forecast'] = pd.NaT

    # Set arrival_forecast to NaT and arrival_forecast_status to Na if the forecast is too late
    new_transport_data.loc[new_transport_data['arrival_forecast'] > new_transport_data['arrival_time'] + pd.Timedelta(minutes=late_thd), 'arrival_forecast_status'] = np.nan
    new_transport_data.loc[new_transport_data['arrival_forecast'] > new_transport_data['arrival_time'] + pd.Timedelta(minutes=late_thd), 'arrival_forecast'] = pd.NaT

    # Set departure_forecast to NaT and departure_forecast_status to Na if the forecast is too late
    new_transport_data.loc[new_transport_data['departure_forecast'] > new_transport_data['departure_time'] + pd.Timedelta(minutes=late_thd), 'departure_forecast_status'] = np.nan
    new_transport_data.loc[new_transport_data['departure_forecast'] > new_transport_data['departure_time'] + pd.Timedelta(minutes=late_thd), 'departure_forecast'] = pd.NaT

    return new_transport_data

def __extract_operator_data(
        transport_data, 
        day_str, 
        overwrite_existing_file=False
):
    """
    Extract the operator data from the transport data and save it to a csv file.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
        day_str (str): String with the day in the format YYYY-MM-DD
        overwrite_existing_file (bool, optional): Whether to overwrite an existing file. Defaults to False.
    """
    operator_data_dst_path = __get_operator_data_dst_path(day_str)
    if os.path.exists(operator_data_dst_path):
        if overwrite_existing_file:
            os.remove(operator_data_dst_path)
        else:
            return
    
    transport_data[['operator_id', 'operator_abbreviation', 'operator_name']] \
        .set_index('operator_id') \
        .drop_duplicates() \
        .to_csv(operator_data_dst_path)

def __delete_unnecessary_columns(transport_data):
    """
    Delete the columns that are not needed for the analysis.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day

    Returns:
        pd.DataFrame: Dataframe with the deleted columns
    """
    new_transport_data = transport_data.copy()
    useless_columns = [
        'circuit_id', 
        'line_id', 
        'operator_id', 
        'operator_abbreviation', 
        'operator_name',
        'stop_name',
        'stop_lon',
        'stop_lat',
    ]
    new_transport_data = new_transport_data.drop(columns=useless_columns)

    return new_transport_data

def __add_delay_columns(transport_data):
    """
    Add the columns with the delay information.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day

    Returns:
        pd.DataFrame: Dataframe with the added columns
    """
    new_transport_data = transport_data.copy()
    new_transport_data['arrival_delay'] = (new_transport_data['arrival_forecast'] - new_transport_data['arrival_time']).dt.total_seconds()
    new_transport_data['departure_delay'] = (new_transport_data['departure_forecast'] - new_transport_data['departure_time']).dt.total_seconds()

    new_transport_data['is_arrival_delayed'] = new_transport_data['arrival_delay'] > 0
    new_transport_data['is_departure_delayed'] = new_transport_data['departure_delay'] > 0

    return new_transport_data

def __save_data(transport_data, day_str):
    """
    Save the data to a parquet file.

    Args:
        transport_data (pd.DataFrame): Dataframe with the data from a day
        day_str (str): String with the day in the format YYYY-MM-DD
    """
    new_transport_data = transport_data.copy()
    new_transport_data['product_id'] = new_transport_data['product_id'].astype('category')
    new_transport_data['line_text'] = new_transport_data['line_text'].astype('category')
    new_transport_data['transport_type'] = new_transport_data['transport_type'].astype('category')

    cleaned_data_dst_path = __get_cleaned_data_dst_path(day_str)
    new_transport_data.to_parquet(cleaned_data_dst_path)

def __preprocessing_pipeline(
        file_name, 
        overwrite_existing_file=False,
        print_progress=True
        ):
    """
    Preprocess the data for a given day.

    Args:
        file_name (str): Name of the file to preprocess
        overwrite_existing_file (bool, optional): Whether to overwrite an existing file. Defaults to False.
        print_progress (bool, optional): Whether to print the progress. Defaults to True.
    """
    day_str = '-'.join(file_name.split('/')[-1].split('-')[:3]).split('_')[0]
    if print_progress:
        print(f"⏳ Preprocessing data file for day {day_str}...")
        print("\tLoading data...")
    transport_data = __get_data_from_file_name(file_name, overwrite_existing_file=overwrite_existing_file)
    if print_progress:
        print("\tTranslating columns...")
    transport_data = __translate_columns(transport_data)
    if print_progress:
        print("\tProcessing product_id...")
    transport_data = __process_product_id(transport_data)
    if print_progress:
        print("\tProcessing transport_type...")
    transport_data = __process_transport_type(transport_data)
    if print_progress:
        print("\tDownloading and loading BAV list...")
    bav_data = __get_bav_data()
    if print_progress:
        print("\tProcessing stops...")
    transport_data = __process_stop(transport_data, bav_data)
    if print_progress:
        print("\tExtracting stop data...")
    __extract_stop_data(transport_data, day_str, overwrite_existing_file=overwrite_existing_file)
    if print_progress:
        print("\tProcessing arrivals...")
    transport_data = __process_arrival(transport_data)
    if print_progress:
        print("\tProcessing departures...")
    transport_data = __process_departure(transport_data)
    if print_progress:
        print("\tHandling inconsistent rows...")
    transport_data = __handle_inconsistent_rows(transport_data)
    if print_progress:
        print("\tExtracting operator data...")
    __extract_operator_data(transport_data, day_str, overwrite_existing_file=overwrite_existing_file)
    if print_progress:
        print("\tDeleting unnecessary columns...")
    transport_data = __delete_unnecessary_columns(transport_data)
    if print_progress:
        print("\tAdding delay columns...")
    transport_data = __add_delay_columns(transport_data)
    if print_progress:
        print("\tSaving data...")
    __save_data(transport_data, day_str)
    if print_progress:
        print("😀 Done!")

    return transport_data

def __is_basic_day(file_date):
    # Check if it's a weekend
    if file_date.weekday() >= 5:
        return False

    # Check if it's a holiday
    country_holidays = holidays.CountryHoliday('CH')
    if file_date in country_holidays:
        return False

    return True

def preprocess_files(
        overwrite_existing_file=False,
        print_progress=True
):
    """
    Preprocess the data for a given list of dates.

    Args:
        overwrite_existing_file (bool, optional): Whether to overwrite an existing file. Defaults to False.
        print_progress (bool, optional): Whether to print the progress. Defaults to True.
    """
    # Find all data files in the data folder
    data_folder = "../../data"
    files = os.listdir(data_folder)
    files = [file for file in files if re.match(r"^\d{4}-\d{2}-\d{2}\_istdaten.csv$", file)]
    files = [file for file in files if __is_basic_day(datetime.strptime(file.split('_')[0], "%Y-%m-%d"))]
    print(f"📁 Found {len(files)} valid file(s) in the data folder.")

    # Preprocess the data for each day
    for file in files:
        __preprocessing_pipeline(
            data_folder + "/" + file, 
            overwrite_existing_file=overwrite_existing_file, 
            print_progress=print_progress
        )