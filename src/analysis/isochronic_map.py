from scipy.ndimage import distance_transform_edt, map_coordinates
from scipy.ndimage import gaussian_filter
from scipy.interpolate import griddata
import matplotlib.pyplot as plt
import plotly.graph_objs as go
import networkx as nx
import pandas as pd
import numpy as np
import json

class IsochronicMap:
    def __init__(
            self, 
            nodes, 
            edges,
            resolution = 1000, 
            left_margin = 0, 
            right_margin = 0,
            top_margin = 0,
            bottom_margin = 0
            ):
        self.nodes = nodes
        self.edges = edges
        self.resolution = resolution
        self.left_margin = left_margin
        self.right_margin = right_margin
        self.top_margin = top_margin
        self.bottom_margin = bottom_margin

        self.nodes = self.set_coordinates()
        self.G = self.init_graph()

    def set_coordinates(self):
        """
        Set the coordinates of the stops in the dataframe.
        
        Returns:
            nodes (pd.DataFrame): The dataframe with the scaled continuous and descrete coordinates.
        """
        # Compute needed values for scaling
        min_x = self.nodes['x'].min()
        max_x = self.nodes['x'].max()
        min_y = self.nodes['y'].min()
        max_y = self.nodes['y'].max()

        lon_scale = self.resolution / (max_x - min_x)
        lat_scale = self.resolution / (max_y - min_y)
        scale = min(lat_scale, lon_scale)

        # Compute continuous and discrete coordinates
        self.nodes['x_con'] = (self.nodes['x'] - min_x) * scale
        self.nodes['y_con'] = (self.nodes['y'] - min_y) * scale
        self.nodes['x_dis'] = self.nodes['x_con'].astype(int)
        self.nodes['y_dis'] = self.nodes['y_con'].astype(int)

        # Compute width and height of the map
        self.width = int((max_x - min_x) * scale)
        self.height = int((max_y - min_y) * scale)

        # Remove old coordinates
        self.nodes.drop(['x', 'y'], axis=1, inplace=True)

        return self.nodes
    
    def init_graph(self):
        """
        Initialize a graph from the nodes and edges.

        Returns:
            G (nx.Graph): The graph.
        """
        G = nx.Graph()

        for _, row in self.nodes.iterrows():
            G.add_node(row['id'], x_con=row['x_con'], y_con=row['y_con'], x_dis=row['x_dis'], y_dis=row['y_dis'], lat=row['lat'], lon=row['lon'])
        for _, row in self.edges.iterrows():
            G.add_edge(row['source'], row['target'], weight=row['weight'])

        print(f'🌐 Created graph with {len(G.nodes):_} nodes and {len(G.edges):_} edges.')

        return G

    
    def show_map(self):
        """
        Show a map of the stops in the dataframe.
        """
        fig = go.Figure()

        fig.add_trace(go.Scattergl(
            x=self.nodes['x_con'],
            y=self.nodes['y_con'],
            mode='markers',
            marker=dict(size=5, color='rgba(0, 0, 255, 0.8)', line=dict(width=1, color='black')),
            text='stop',
            hoverinfo='text'
        ))

        fig.update_layout(
            xaxis=dict(range=[-self.left_margin, self.width + self.right_margin], title='X', scaleanchor="y", scaleratio=1),
            yaxis=dict(range=[-self.bottom_margin, self.height + self.top_margin], title='Y', scaleanchor="x", scaleratio=1),
            title='Map of every transport stop in Switzerland',
            hovermode='closest',
            autosize=False,
            width=self.width / 2,
            height=self.height / 2,
        )

        fig.show()

    def get_shortest_path_scores_from_node_id(self, node_id):
        """
        Get the shortest path scores from a node id, using Dijkstra's algorithm.

        Args:
            node_id (int): The node id to get the shortest path scores from.

        Returns:
            shortest_path_scores (pd.DataFrame): The shortest path scores from the node id.
        """
        shortest_path_scores = nx.single_source_dijkstra_path_length(self.G, node_id)
        shortest_path_scores = pd.DataFrame.from_dict(shortest_path_scores, orient='index', columns=['score'])
        shortest_path_scores.index = shortest_path_scores.index.astype(int)

        return shortest_path_scores
    
    def get_nn_isochronic_map_for_node_id(self, node_id):
        """
        Get the nearest neighbor isochronic map for a node id.

        Args:
            node_id (int): The node id to get the isochronic map for.

        Returns:
            isochronic_map (np.array): The isochronic map for the node id.
        """
        isochronic_map = np.zeros((
            self.width + self.left_margin + self.right_margin + 1, 
            self.height + self.top_margin + self.bottom_margin + 1
        ))

        shortest_path_scores = self.get_shortest_path_scores_from_node_id(node_id)
        nodes_scores = self.nodes.join(shortest_path_scores, on='id', how='inner')

        for _, row in nodes_scores.iterrows():
            isochronic_map[int(row['x_dis'] + self.left_margin), int(row['y_dis'] + self.bottom_margin)] = row['score']

        # Make a binary version of the map where stops are 1 and everywhere else is 0
        binary_map = np.where(isochronic_map > 0, 1, 0)

        # Compute the Euclidean distance transform of the binary map
        # and also get the indices of the nearest non-zero points
        distance_map, indices = distance_transform_edt(1 - binary_map, return_indices=True)

        # Map the indices of the nearest non-zero points onto the original isochronic map to get the scores
        interpolated_map = map_coordinates(isochronic_map, indices, order=0)

        # Convert distance to time
        switzerland_width = 348                             # km
        walking_speed = 6                                   # km/h
        map_width = distance_map.shape[0]                   # px
        scale = switzerland_width / map_width               # km/px
        distance_map = distance_map * scale                 # Real distance in km
        time_map = distance_map / walking_speed * 60 * 60   # Time in seconds

        # Add the time map to the interpolated map
        interpolated_map = interpolated_map + time_map

        return interpolated_map

    def show_isochronic_map_for_node_id(self, node_id, with_steps=False):
        """
        Show the isochronic map for a node id.
        
        Args:
            node_id (int): The node id to show the isochronic map for.
        """
        # Get the isochronic map
        isochronic_map = self.get_nn_isochronic_map_for_node_id(node_id)
        isochronic_map = np.rot90(isochronic_map)

        max_time = isochronic_map.max()
        print(f'Max time: {max_time / 60 / 60:.2f} hours')
        min_time = isochronic_map.min()
        print(f'Min time: {min_time / 60 / 60:.2f} hours')

        # Plot the isochronic map
        fig, ax = plt.subplots()
        dpi = 100
        fig.set_size_inches(self.width / dpi, self.height / dpi)
        ax.imshow(isochronic_map, cmap='hot', interpolation='nearest')
        ax.axis('off')

        if with_steps:
            # Plot the steps
            steps = np.arange(0, isochronic_map.max(), 60 * 60)
            for step in steps:
                ax.contour(isochronic_map, levels=[step], colors='black', linewidths=1)

        plt.show()

    def save_isochronic_map_for_node_id(self, isochronic_map, node_id):
        """
        Save the isochronic map for a node id.

        Args:
            isochronic_map (np.array): The isochronic map to save.
        """
        # Get the isochronic map
        isochronic_map = np.rot90(isochronic_map)

        # Convert the numpy array to a nested list
        nested_list = isochronic_map.tolist()

        node = self.nodes[self.nodes['id'] == node_id].iloc[0]
        data = {
            'iso_center': [node['lat'], node['lon']],
            'map': nested_list
        }

        # Save the nested list in JSON format
        with open(f'isochronic_map_{node_id}.json', 'w') as f:
            json.dump(data, f)


