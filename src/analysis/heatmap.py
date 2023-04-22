import numpy as np
from scipy import ndimage
import plotly.graph_objs as go
import matplotlib.pyplot as plt

class Heatmap:
    def __init__(
            self, 
            df, 
            resolution = 1000, 
            left_margin = 0, 
            right_margin = 0,
            top_margin = 0,
            bottom_margin = 0
            ):
        self.df = df
        self.resolution = resolution
        self.left_margin = left_margin
        self.right_margin = right_margin
        self.top_margin = top_margin
        self.bottom_margin = bottom_margin

        self.df = self.set_coordinates()

    def set_coordinates(self):
        """
        Set the coordinates of the stops in the dataframe.
        
        Returns:
            df (pd.DataFrame): The dataframe with the scaled continuous and descrete coordinates.
        """
        min_x = self.df['x'].min()
        max_x = self.df['x'].max()
        min_y = self.df['y'].min()
        max_y = self.df['y'].max()

        lon_scale = self.resolution / (max_x - min_x)
        lat_scale = self.resolution / (max_y - min_y)
        scale = min(lat_scale, lon_scale)

        self.df['x_con'] = (self.df['x'] - min_x) * scale
        self.df['y_con'] = (self.df['y'] - min_y) * scale
        self.df['x_dis'] = self.df['x_con'].astype(int)
        self.df['y_dis'] = self.df['y_con'].astype(int)

        self.width = int((max_x - min_x) * scale)
        self.height = int((max_y - min_y) * scale)

        return self.df
    
    def get_density_heatmap(self, radius=10):
        """
        Compute the density of the stops in the dataframe.
        
        Args:
            radius (int): The radius of the Gaussian filter.
            
        Returns:
            density_filtered (np.array): The density of the stops.
        """
        density = np.zeros((
            self.width + self.left_margin + self.right_margin + 1, 
            self.height + self.top_margin + self.bottom_margin + 1
        ))

        for _, row in self.df.iterrows():
            x = int(row['x_dis']) + self.left_margin
            y = int(row['y_dis']) + self.bottom_margin
            density[x, y] += 1

        # Apply a Gaussian filter to compute the densities
        density_filtered = ndimage.gaussian_filter(density, sigma=radius)

        return density_filtered
    
    def get_density_heatmap_for_transport_type(self, transport_type, radius=10):
        """
        Compute the density of the stops in the dataframe for a specific transport type.
        
        Args:
            transport_type (str): The transport type.
            radius (int): The radius of the Gaussian filter.
        
        Returns:
            density_filtered (np.array): The density of the stops.
        """
        density = np.zeros((
            self.width + self.left_margin + self.right_margin + 1, 
            self.height + self.top_margin + self.bottom_margin + 1
        ))

        for _, row in self.df.iterrows():
            if row[f'is_{transport_type}_stop']:
                x = int(row['x_dis']) + self.left_margin
                y = int(row['y_dis']) + self.bottom_margin
                density[x, y] += 1

        # Apply a Gaussian filter to compute the densities
        density_filtered = ndimage.gaussian_filter(density, sigma=radius)

        return density_filtered
    
    def show_map(self):
        """
        Show a map of the stops in the dataframe.
        """
        fig = go.Figure()

        fig.add_trace(go.Scattergl(
            x=self.df['x_con'],
            y=self.df['y_con'],
            mode='markers',
            marker=dict(size=5, color='rgba(0, 0, 255, 0.8)', line=dict(width=1, color='black')),
            text=self.df.stop_name,  # This can be customized to display more information on hover
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

    def show_heatmap(self, density):
        """
        Show a heatmap.
        """
        fig, ax = plt.subplots()
        dpi = 100
        fig.set_size_inches(self.width / dpi, self.height / dpi)
        ax.imshow(density, cmap='hot', interpolation='nearest')
        ax.axis('off')
        plt.show()

    def show_density_heatmap(self, radius=10):
        """
        Show the density heatmap of the stops in the dataframe.
        """
        density = self.get_density_heatmap(radius)
        density = np.rot90(density)

        self.show_heatmap(density)

    def show_density_heatmap_for_transport_type(self, transport_type, radius=10):
        """
        Show the density heatmap of the stops in the dataframe for a specific transport type.
        """
        density = self.get_density_heatmap_for_transport_type(transport_type, radius)
        density = np.rot90(density)

        self.show_heatmap(density)

    def show_density_heatmap_for_all_transport_types(self, radius=10):
        """
        Show the density heatmap of the stops in the dataframe for all transport types.
        """
        transport_types = ['bus', 'tram', 'train', 'metro', 'rack_railway', 'boat']
        num_transport_types = len(transport_types)

        fig, axes = plt.subplots(nrows=1, ncols=num_transport_types, figsize=(4 * num_transport_types, 4))
        dpi = 100
        fig.set_size_inches(self.width / dpi, self.height / dpi)

        for i, transport_type in enumerate(transport_types):
            density = self.get_density_heatmap_for_transport_type(transport_type, radius)
            density = np.rot90(density)

            ax = axes[i]
            ax.imshow(density, cmap='hot', interpolation='nearest')
            ax.set_title(f"{transport_type.capitalize()}")
            ax.axis('off')

        plt.tight_layout()
        plt.show()