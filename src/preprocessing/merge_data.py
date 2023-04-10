"""
AN EQUIVALENT SPARK VERSION OF THIS SCRIPT IS AVAILABLE IN THE SPARK FOLDER.
THIS SCRIPT TAKE A LONG TIME TO RUN, SO IT IS RECOMMENDED TO RUN THE SPARK VERSION INSTEAD.
"""

import os
from tqdm import tqdm
import numpy as np
import regex as re
import pandas as pd

def __get_processed_path_folder():
    return '../../data/processed'

def __get_operator_data_dst_path():
    return __get_processed_path_folder() + '/operators.csv'

def __get_stop_data_dst_path():
    return __get_processed_path_folder() + '/stops.csv'

def __get_transport_data_dst_path():
    return __get_processed_path_folder() + '/transports.parquet'

def __get_operator_data_regex():
    return r'\d{4}-\d{2}-\d{2}\_operators.csv'

def __get_stop_data_regex():
    return r'\d{4}-\d{2}-\d{2}\_stops.csv'

def __get_transport_data_regex():
    return r'\d{4}-\d{2}-\d{2}\_istdaten\_cleaned.parquet'

def merge_and_save_operator_data():
    """
    Merge all the operators data into one file and save it.
    """
    files = os.listdir(__get_processed_path_folder())
    files = [file for file in files if re.match(__get_operator_data_regex(), file)]

    operators_data = pd.DataFrame()
    for file in files:
        operator_data = pd.read_csv(os.path.join(__get_processed_path_folder(), file))
        operators_data = pd.concat([operators_data, operator_data], ignore_index=True)
    
    # Find duplicates abbreviations and remove the ones with the least amount of counts
    id_abbreviations = operators_data \
        .groupby(['operator_id', 'operator_abbreviation']) \
        .agg({'operator_id': 'count'}) \
        .rename(columns={'operator_id': 'count'}) \
        .reset_index()

    id_abbreviations = id_abbreviations \
        .sort_values('count', ascending=False) \
        .drop_duplicates(subset='operator_id', keep='first')[['operator_id', 'operator_abbreviation']]

    # Find duplicates names and remove the ones with the least amount of counts
    id_names = operators_data \
        .groupby(['operator_id', 'operator_name']) \
        .agg({'operator_id': 'count'}) \
        .rename(columns={'operator_id': 'count'}) \
        .reset_index()

    id_names = id_names \
        .sort_values('count', ascending=False) \
        .drop_duplicates(subset='operator_id', keep='first')[['operator_id', 'operator_name']]
    
    # Merge the dataframes
    operators_data = id_abbreviations.merge(id_names, on='operator_id', how='inner')

    # Save the data
    operators_data.to_csv(__get_operator_data_dst_path(), index=False)

def merge_and_save_stop_data():
    """
    Merge all the stops data into one file and save it.
    """
    files = os.listdir(__get_processed_path_folder())
    files = [file for file in files if re.match(__get_stop_data_regex(), file)]

    stops_data = pd.DataFrame()
    for file in files:
        stop_data = pd.read_csv(os.path.join(__get_processed_path_folder(), file))
        stops_data = pd.concat([stops_data, stop_data], ignore_index=True)

    # Find duplicates stop ids and remove the ones with the least amount of counts
    id_stops = stops_data \
        .groupby(['stop_id', 'stop_name', 'stop_lon', 'stop_lat']) \
        .agg({'stop_id': 'count'}) \
        .rename(columns={'stop_id': 'count'}) \
        .reset_index()

    id_stops = id_stops \
        .sort_values('count', ascending=False) \
        .drop_duplicates(subset='stop_id', keep='first')[['stop_id', 'stop_name', 'stop_lon', 'stop_lat']]
    
    # Save the data
    id_stops.to_csv(__get_stop_data_dst_path(), index=False)

def __structure_transport_data(transport_data_1):
    """
    Structure the first transport data.
    """
    new_transport_data_1 = transport_data_1.copy()
    # Delete useless columns
    new_transport_data_1 = new_transport_data_1.drop(columns=[
        'arrival_forecast_status', 
        'departure_forecast_status',
        'date'
    ])

    # Add arrival_delays and departure_delays columns and drop corresponding delay columns
    new_transport_data_1['arrival_delays'] = new_transport_data_1['arrival_delay'].apply(lambda x: [] if np.isnan(x) else [x])
    new_transport_data_1['departure_delays'] = new_transport_data_1['departure_delay'].apply(lambda x: [] if np.isnan(x) else [x])
    new_transport_data_1 = new_transport_data_1.drop(columns=['arrival_delay', 'departure_delay'])

    # Add n_arrival_delays and n_departure_delays columns and drop corresponding delay columns
    new_transport_data_1['n_arrival_delays'] = new_transport_data_1['is_arrival_delayed'].apply(lambda x: 1 if x else 0)
    new_transport_data_1['n_departure_delays'] = new_transport_data_1['is_departure_delayed'].apply(lambda x: 1 if x else 0)
    new_transport_data_1 = new_transport_data_1.drop(columns=['is_arrival_delayed', 'is_departure_delayed'])

    # Add n_cancelled and n_through_trip, n_additional_trip columns and drop corresponding boolean columns
    new_transport_data_1['n_cancelled'] = new_transport_data_1['is_cancelled'].apply(lambda x: 1 if x else 0)
    new_transport_data_1['n_through_trip'] = new_transport_data_1['is_through_trip'].apply(lambda x: 1 if x else 0)
    new_transport_data_1['n_additional_trip'] = new_transport_data_1['is_additional_trip'].apply(lambda x: 1 if x else 0)
    new_transport_data_1 = new_transport_data_1.drop(columns=['is_cancelled', 'is_through_trip', 'is_additional_trip'])

    # Delete arrival_forecast and departure_forecast columns
    new_transport_data_1 = new_transport_data_1.drop(columns=['arrival_forecast', 'departure_forecast'])

    # Add generic n_entries column
    new_transport_data_1['n_entries'] = 1

    # Remove the day from arrival_time and departure_time
    new_transport_data_1['arrival_time'] = new_transport_data_1['arrival_time'].dt.time
    new_transport_data_1['departure_time'] = new_transport_data_1['departure_time'].dt.time

    return new_transport_data_1

def __merge_transport_data(transport_data_1, transport_data_2):
    """
    Merge two transport dataframes into one.
    """
    transport_data_2 = __structure_transport_data(transport_data_2)

    # Merge the dataframes
    transport_data = transport_data_1.merge(transport_data_2, on=['trip_id', 'product_id', 'line_text', 'transport_type', 'stop_id', 'arrival_time', 'departure_time'], how='outer')

    # Merge arrival_delays and departure_delays columns
    transport_data['arrival_delays_x'] = transport_data['arrival_delays_x'].apply(lambda x: x if isinstance(x, list) else [])
    transport_data['arrival_delays_y'] = transport_data['arrival_delays_y'].apply(lambda x: x if isinstance(x, list) else [])
    transport_data['departure_delays_x'] = transport_data['departure_delays_x'].apply(lambda x: x if isinstance(x, list) else [])
    transport_data['departure_delays_y'] = transport_data['departure_delays_y'].apply(lambda x: x if isinstance(x, list) else [])
    transport_data['arrival_delays'] = transport_data.apply(lambda x: x['arrival_delays_x'] + x['arrival_delays_y'], axis=1)
    transport_data['departure_delays'] = transport_data.apply(lambda x: x['departure_delays_x'] + x['departure_delays_y'], axis=1)

    # Merge n_arrival_delays and n_departure_delays columns
    transport_data['n_arrival_delays_x'] = transport_data['n_arrival_delays_x'].fillna(0)
    transport_data['n_arrival_delays_y'] = transport_data['n_arrival_delays_y'].fillna(0)
    transport_data['n_departure_delays_x'] = transport_data['n_departure_delays_x'].fillna(0)
    transport_data['n_departure_delays_y'] = transport_data['n_departure_delays_y'].fillna(0)
    transport_data['n_arrival_delays'] = transport_data.apply(lambda x: x['n_arrival_delays_x'] + x['n_arrival_delays_y'], axis=1)
    transport_data['n_departure_delays'] = transport_data.apply(lambda x: x['n_departure_delays_x'] + x['n_departure_delays_y'], axis=1)

    # Merge n_cancelled, n_through_trip, n_additional_trip columns
    transport_data['n_cancelled_x'] = transport_data['n_cancelled_x'].fillna(0)
    transport_data['n_cancelled_y'] = transport_data['n_cancelled_y'].fillna(0)
    transport_data['n_through_trip_x'] = transport_data['n_through_trip_x'].fillna(0)
    transport_data['n_through_trip_y'] = transport_data['n_through_trip_y'].fillna(0)
    transport_data['n_additional_trip_x'] = transport_data['n_additional_trip_x'].fillna(0)
    transport_data['n_additional_trip_y'] = transport_data['n_additional_trip_y'].fillna(0)
    transport_data['n_cancelled'] = transport_data.apply(lambda x: x['n_cancelled_x'] + x['n_cancelled_y'], axis=1)
    transport_data['n_through_trip'] = transport_data.apply(lambda x: x['n_through_trip_x'] + x['n_through_trip_y'], axis=1)
    transport_data['n_additional_trip'] = transport_data.apply(lambda x: x['n_additional_trip_x'] + x['n_additional_trip_y'], axis=1)

    # Merge n_entries columns
    transport_data['n_entries_x'] = transport_data['n_entries_x'].fillna(0)
    transport_data['n_entries_y'] = transport_data['n_entries_y'].fillna(0)
    transport_data['n_entries'] = transport_data.apply(lambda x: x['n_entries_x'] + x['n_entries_y'], axis=1)

    # Delete useless columns
    transport_data = transport_data.drop(columns=[
        'arrival_delays_x', 'arrival_delays_y',
        'departure_delays_x', 'departure_delays_y',
        'n_arrival_delays_x', 'n_arrival_delays_y',
        'n_departure_delays_x', 'n_departure_delays_y',
        'n_cancelled_x', 'n_cancelled_y',
        'n_through_trip_x', 'n_through_trip_y',
        'n_additional_trip_x', 'n_additional_trip_y',
        'n_entries_x', 'n_entries_y'
    ])


    return transport_data

def merge_and_save_transport_data():
    """
    Merge the transport data into one file and save it.
    """
    files = os.listdir(__get_processed_path_folder())
    files = [file for file in files if re.match(__get_transport_data_regex(), file)]

    transport_data_1 = pd.read_parquet(os.path.join(__get_processed_path_folder(), files[0]))
    transport_data_1 = __structure_transport_data(transport_data_1)
    files = files[1:]
    for file in tqdm(files):
        transport_data_2 = pd.read_parquet(os.path.join(__get_processed_path_folder(), file))
        transport_data_1 = __merge_transport_data(transport_data_1, transport_data_2)

    # Save the merged dataframe
    transport_data_1.to_parquet(os.path.join(__get_processed_path_folder(), __get_transport_data_dst_path()))

    return transport_data_1
