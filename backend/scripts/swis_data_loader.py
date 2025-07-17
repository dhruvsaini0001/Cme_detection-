#!/usr/bin/env python3
"""
SWIS Data Loader Module
======================

Utilities for loading and preprocessing SWIS Level-2 data from Aditya-L1 mission.
Handles CDF file reading, data validation, and time series preparation.

Author: Your Name
Date: 2025
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import warnings
from scipy import signal
from scipy.stats import zscore
from scipy.interpolate import interp1d

# CDF reading libraries
try:
    from spacepy import pycdf
    SPACEPY_AVAILABLE = True
except ImportError:
    SPACEPY_AVAILABLE = False

try:
    import cdflib
    CDFLIB_AVAILABLE = True
except ImportError:
    CDFLIB_AVAILABLE = False

logger = logging.getLogger(__name__)

class SWISDataLoader:
    """
    Class for loading and preprocessing SWIS Level-2 data from CDF files.
    """
    
    def __init__(self):
        """Initialize the SWIS data loader."""
        self.data_quality_flags = {
            'valid_range_velocity': (200, 1200),      # km/s
            'valid_range_density': (0.1, 100),        # cm^-3
            'valid_range_temperature': (1e4, 1e7),    # K
            'valid_range_flux': (0, 1e12),            # particles/(cm^2*s)
            'max_gap_minutes': 30,                     # Maximum gap for interpolation
            'outlier_threshold_sigma': 5               # Sigma threshold for outlier detection
        }
    
    def load_cdf_file(self, file_path: str) -> pd.DataFrame:
        """
        Load a single SWIS CDF file.
        
        Parameters:
        -----------
        file_path : str
            Path to the CDF file
            
        Returns:
        --------
        pd.DataFrame
            Loaded SWIS data
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"CDF file not found: {file_path}")
        
        logger.info(f"Loading CDF file: {file_path}")
        
        try:
            if SPACEPY_AVAILABLE:
                return self._load_with_spacepy(file_path)
            elif CDFLIB_AVAILABLE:
                return self._load_with_cdflib(file_path)
            else:
                raise ImportError("No CDF reading library available. Install spacepy or cdflib.")
                
        except Exception as e:
            logger.error(f"Failed to load {file_path}: {e}")
            raise
    
    def _load_with_spacepy(self, file_path: Path) -> pd.DataFrame:
        """Load CDF file using spacepy.pycdf."""
        cdf = pycdf.CDF(str(file_path))
        
        try:
            # Extract common SWIS Level-2 variables
            # Note: Variable names may differ in actual SWIS data - adjust accordingly
            data = {}
            
            # Time variable (typically 'Epoch' or 'Time')
            if 'Epoch' in cdf:
                data['timestamp'] = cdf['Epoch'][:]
            elif 'Time' in cdf:
                data['timestamp'] = cdf['Time'][:]
            else:
                # Look for time-like variables
                time_vars = [var for var in cdf.keys() if 'time' in var.lower() or 'epoch' in var.lower()]
                if time_vars:
                    data['timestamp'] = cdf[time_vars[0]][:]
                else:
                    raise ValueError("No time variable found in CDF file")
            
            # Proton parameters
            param_mapping = {
                'proton_velocity': ['Vp', 'V_proton', 'proton_velocity', 'velocity'],
                'proton_density': ['Np', 'N_proton', 'proton_density', 'density'],
                'proton_temperature': ['Tp', 'T_proton', 'proton_temperature', 'temperature'],
                'proton_flux': ['Flux_p', 'proton_flux', 'flux']
            }
            
            for param, possible_names in param_mapping.items():
                for name in possible_names:
                    if name in cdf:
                        data[param] = cdf[name][:]
                        break
                else:
                    logger.warning(f"Parameter {param} not found in CDF file")
                    # Create placeholder with NaN values
                    data[param] = np.full(len(data['timestamp']), np.nan)
            
            # Quality flags if available
            if 'Quality_flag' in cdf:
                data['quality_flag'] = cdf['Quality_flag'][:]
            
        finally:
            cdf.close()
        
        return pd.DataFrame(data)
    
    def _load_with_cdflib(self, file_path: Path) -> pd.DataFrame:
        """Load CDF file using cdflib."""
        cdf = cdflib.CDF(str(file_path))
        
        # Get available variables
        variables = cdf.cdf_info()['zVariables']
        
        data = {}
        
        # Find time variable
        time_vars = [var for var in variables if 'time' in var.lower() or 'epoch' in var.lower()]
        if time_vars:
            data['timestamp'] = cdf.varget(time_vars[0])
        else:
            raise ValueError("No time variable found in CDF file")
        
        # Extract proton parameters
        param_mapping = {
            'proton_velocity': ['Vp', 'V_proton', 'proton_velocity', 'velocity'],
            'proton_density': ['Np', 'N_proton', 'proton_density', 'density'],
            'proton_temperature': ['Tp', 'T_proton', 'proton_temperature', 'temperature'],
            'proton_flux': ['Flux_p', 'proton_flux', 'flux']
        }
        
        for param, possible_names in param_mapping.items():
            for name in possible_names:
                if name in variables:
                    data[param] = cdf.varget(name)
                    break
            else:
                logger.warning(f"Parameter {param} not found in CDF file")
                data[param] = np.full(len(data['timestamp']), np.nan)
        
        # Quality flags if available
        if 'Quality_flag' in variables:
            data['quality_flag'] = cdf.varget('Quality_flag')
        
        return pd.DataFrame(data)
    
    def load_multiple_files(self, file_paths: List[str]) -> pd.DataFrame:
        """
        Load multiple SWIS CDF files and concatenate them.
        
        Parameters:
        -----------
        file_paths : List[str]
            List of paths to CDF files
            
        Returns:
        --------
        pd.DataFrame
            Combined SWIS data sorted by timestamp
        """
        dataframes = []
        
        for file_path in file_paths:
            try:
                df = self.load_cdf_file(file_path)
                dataframes.append(df)
            except Exception as e:
                logger.error(f"Failed to load {file_path}: {e}")
                continue
        
        if not dataframes:
            raise ValueError("No files were successfully loaded")
        
        # Concatenate and sort by timestamp
        combined_df = pd.concat(dataframes, ignore_index=True)
        combined_df = combined_df.sort_values('timestamp').reset_index(drop=True)
        
        logger.info(f"Loaded {len(dataframes)} files with {len(combined_df)} total records")
        
        return combined_df
    
    def preprocess_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess SWIS data with quality control and cleaning.
        
        Parameters:
        -----------
        df : pd.DataFrame
            Raw SWIS data
            
        Returns:
        --------
        pd.DataFrame
            Preprocessed SWIS data
        """
        df_processed = df.copy()
        
        # Convert timestamp to datetime if not already
        if not pd.api.types.is_datetime64_any_dtype(df_processed['timestamp']):
            df_processed['timestamp'] = pd.to_datetime(df_processed['timestamp'])
        
        # Set timestamp as index
        df_processed.set_index('timestamp', inplace=True)
        
        # Remove duplicates
        df_processed = df_processed[~df_processed.index.duplicated(keep='first')]
        
        # Apply quality filters
        df_processed = self._apply_quality_filters(df_processed)
        
        # Remove outliers
        df_processed = self._remove_outliers(df_processed)
        
        # Fill small gaps with interpolation
        df_processed = self._interpolate_gaps(df_processed)
        
        # Add quality indicators
        df_processed = self._add_quality_indicators(df_processed)
        
        logger.info(f"Preprocessing complete. Final data shape: {df_processed.shape}")
        
        return df_processed
    
    def _apply_quality_filters(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply data quality filters based on physical ranges."""
        df_filtered = df.copy()
        
        # Apply range filters
        ranges = self.data_quality_flags
        
        # Velocity filter
        v_min, v_max = ranges['valid_range_velocity']
        df_filtered.loc[(df_filtered['proton_velocity'] < v_min) | 
                       (df_filtered['proton_velocity'] > v_max), 'proton_velocity'] = np.nan
        
        # Density filter
        n_min, n_max = ranges['valid_range_density']
        df_filtered.loc[(df_filtered['proton_density'] < n_min) | 
                       (df_filtered['proton_density'] > n_max), 'proton_density'] = np.nan
        
        # Temperature filter
        t_min, t_max = ranges['valid_range_temperature']
        df_filtered.loc[(df_filtered['proton_temperature'] < t_min) | 
                       (df_filtered['proton_temperature'] > t_max), 'proton_temperature'] = np.nan
        
        # Flux filter
        f_min, f_max = ranges['valid_range_flux']
        df_filtered.loc[(df_filtered['proton_flux'] < f_min) | 
                       (df_filtered['proton_flux'] > f_max), 'proton_flux'] = np.nan
        
        return df_filtered
    
    def _remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove statistical outliers using z-score method."""
        df_clean = df.copy()
        
        parameters = ['proton_velocity', 'proton_density', 'proton_temperature', 'proton_flux']
        threshold = self.data_quality_flags['outlier_threshold_sigma']
        
        for param in parameters:
            if param in df_clean.columns:
                # Calculate z-scores for non-NaN values
                valid_data = df_clean[param].dropna()
                if len(valid_data) > 10:  # Need sufficient data for z-score
                    z_scores = np.abs(zscore(valid_data))
                    outlier_indices = valid_data.index[z_scores > threshold]
                    df_clean.loc[outlier_indices, param] = np.nan
                    
                    logger.info(f"Removed {len(outlier_indices)} outliers from {param}")
        
        return df_clean
    
    def _interpolate_gaps(self, df: pd.DataFrame) -> pd.DataFrame:
        """Interpolate small gaps in the data."""
        df_interp = df.copy()
        
        parameters = ['proton_velocity', 'proton_density', 'proton_temperature', 'proton_flux']
        max_gap = pd.Timedelta(minutes=self.data_quality_flags['max_gap_minutes'])
        
        for param in parameters:
            if param in df_interp.columns:
                # Only interpolate if gaps are small enough
                df_interp[param] = df_interp[param].interpolate(
                    method='time',
                    limit=int(max_gap.total_seconds() / 60)  # Convert to approximate data points
                )
        
        return df_interp
    
    def _add_quality_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add data quality indicators."""
        df_quality = df.copy()
        
        # Calculate data completeness for each parameter
        parameters = ['proton_velocity', 'proton_density', 'proton_temperature', 'proton_flux']
        
        for param in parameters:
            if param in df_quality.columns:
                # Data availability flag (1 if data present, 0 if NaN)
                df_quality[f'{param}_available'] = (~df_quality[param].isna()).astype(int)
        
        # Overall data quality score (0-1)
        availability_cols = [col for col in df_quality.columns if col.endswith('_available')]
        if availability_cols:
            df_quality['data_quality_score'] = df_quality[availability_cols].mean(axis=1)
        
        return df_quality
    
    def extract_time_window(self, df: pd.DataFrame, start_time: datetime, 
                           end_time: datetime) -> pd.DataFrame:
        """
        Extract data for a specific time window.
        
        Parameters:
        -----------
        df : pd.DataFrame
            Preprocessed SWIS data with timestamp index
        start_time : datetime
            Start of time window
        end_time : datetime
            End of time window
            
        Returns:
        --------
        pd.DataFrame
            Data within the specified time window
        """
        if not isinstance(df.index, pd.DatetimeIndex):
            raise ValueError("DataFrame must have datetime index")
        
        # Extract window
        window_data = df.loc[start_time:end_time].copy()
        
        if len(window_data) == 0:
            logger.warning(f"No data found in time window {start_time} to {end_time}")
        else:
            logger.info(f"Extracted {len(window_data)} records for time window")
        
        return window_data
    
    def calculate_derived_parameters(self, df: pd.DataFrame, 
                                   window_size: str = '1H') -> pd.DataFrame:
        """
        Calculate derived parameters for CME detection.
        
        Parameters:
        -----------
        df : pd.DataFrame
            Preprocessed SWIS data
        window_size : str
            Rolling window size for calculations
            
        Returns:
        --------
        pd.DataFrame
            Data with additional derived parameters
        """
        df_derived = df.copy()
        
        # Parameters for calculations
        params = ['proton_velocity', 'proton_density', 'proton_temperature', 'proton_flux']
        
        for param in params:
            if param in df_derived.columns:
                # Moving averages
                df_derived[f'{param}_ma'] = df_derived[param].rolling(window=window_size).mean()
                
                # Moving standard deviation
                df_derived[f'{param}_std'] = df_derived[param].rolling(window=window_size).std()
                
                # Rate of change (gradient)
                df_derived[f'{param}_gradient'] = df_derived[param].diff()
                
                # Normalized gradient
                df_derived[f'{param}_norm_gradient'] = (
                    df_derived[f'{param}_gradient'] / df_derived[f'{param}_ma']
                )
                
                # Z-score relative to rolling mean
                df_derived[f'{param}_zscore'] = (
                    (df_derived[param] - df_derived[f'{param}_ma']) / 
                    df_derived[f'{param}_std']
                )
        
        # Combined parameters for CME detection
        if all(param in df_derived.columns for param in params):
            # Dynamic pressure (assuming proton mass)
            proton_mass = 1.67e-27  # kg
            df_derived['dynamic_pressure'] = (
                proton_mass * df_derived['proton_density'] * 1e6 *  # Convert cm^-3 to m^-3
                (df_derived['proton_velocity'] * 1000) ** 2  # Convert km/s to m/s
            )
            
            # Plasma beta (ratio of thermal to magnetic pressure)
            # Note: Magnetic field data would be needed for accurate calculation
            # This is a simplified proxy using thermal pressure
            k_boltzmann = 1.38e-23  # J/K
            df_derived['thermal_pressure'] = (
                df_derived['proton_density'] * 1e6 * k_boltzmann * df_derived['proton_temperature']
            )
            
            # Combined CME indicator score
            velocity_enhanced = (df_derived['proton_velocity_zscore'] > 2)
            density_enhanced = (df_derived['proton_density_zscore'] > 1.5)
            temp_anomaly = (np.abs(df_derived['proton_temperature_zscore']) > 2)
            
            df_derived['cme_indicator_score'] = (
                velocity_enhanced.astype(int) + 
                density_enhanced.astype(int) + 
                temp_anomaly.astype(int)
            )
        
        logger.info("Derived parameters calculated successfully")
        
        return df_derived
    
    def get_data_summary(self, df: pd.DataFrame) -> Dict:
        """
        Generate summary statistics for the SWIS data.
        
        Parameters:
        -----------
        df : pd.DataFrame
            SWIS data
            
        Returns:
        --------
        Dict
            Summary statistics
        """
        summary = {}
        
        # Time range
        if isinstance(df.index, pd.DatetimeIndex):
            summary['time_range'] = {
                'start': df.index.min(),
                'end': df.index.max(),
                'duration': df.index.max() - df.index.min()
            }
        
        # Data availability
        params = ['proton_velocity', 'proton_density', 'proton_temperature', 'proton_flux']
        summary['data_availability'] = {}
        
        for param in params:
            if param in df.columns:
                total_points = len(df)
                valid_points = df[param].notna().sum()
                summary['data_availability'][param] = {
                    'total_points': total_points,
                    'valid_points': valid_points,
                    'completeness': valid_points / total_points if total_points > 0 else 0
                }
        
        # Basic statistics
        summary['statistics'] = df.describe().to_dict()
        
        return summary
    
    def export_processed_data(self, df: pd.DataFrame, output_path: str, 
                             format: str = 'csv') -> None:
        """
        Export processed data to file.
        
        Parameters:
        -----------
        df : pd.DataFrame
            Processed SWIS data
        output_path : str
            Output file path
        format : str
            Output format ('csv', 'hdf5', 'pickle')
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if format.lower() == 'csv':
            df.to_csv(output_path)
        elif format.lower() == 'hdf5':
            df.to_hdf(output_path, key='swis_data', mode='w')
        elif format.lower() == 'pickle':
            df.to_pickle(output_path)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"Data exported to {output_path}")

# Utility functions for CME analysis
def detect_sudden_changes(series: pd.Series, threshold: float = 2.0, 
                         window: str = '30min') -> pd.Series:
    """
    Detect sudden changes in a time series that might indicate CME arrival.
    
    Parameters:
    -----------
    series : pd.Series
        Time series data
    threshold : float
        Z-score threshold for detection
    window : str
        Window size for rolling statistics
        
    Returns:
    --------
    pd.Series
        Boolean series indicating sudden changes
    """
    # Calculate rolling statistics
    rolling_mean = series.rolling(window=window).mean()
    rolling_std = series.rolling(window=window).std()
    
    # Calculate z-scores
    z_scores = (series - rolling_mean) / rolling_std
    
    # Detect sudden changes
    sudden_changes = np.abs(z_scores) > threshold
    
    return sudden_changes

def calculate_shock_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate shock indicators that are characteristic of CME-driven shocks.
    
    Parameters:
    -----------
    df : pd.DataFrame
        SWIS data with derived parameters
        
    Returns:
    --------
    pd.DataFrame
        Data with shock indicators
    """
    df_shock = df.copy()
    
    # Velocity enhancement
    df_shock['velocity_enhancement'] = detect_sudden_changes(
        df_shock['proton_velocity'], threshold=2.5
    )
    
    # Density compression
    df_shock['density_enhancement'] = detect_sudden_changes(
        df_shock['proton_density'], threshold=2.0
    )
    
    # Temperature depression/enhancement
    df_shock['temperature_anomaly'] = detect_sudden_changes(
        df_shock['proton_temperature'], threshold=2.0
    )
    
    # Combined shock score
    df_shock['shock_score'] = (
        df_shock['velocity_enhancement'].astype(int) +
        df_shock['density_enhancement'].astype(int) +
        df_shock['temperature_anomaly'].astype(int)
    )
    
    return df_shock

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Initialize loader
    loader = SWISDataLoader()
    
    # Example: Load and process a single file
    # df = loader.load_cdf_file("path/to/swis_data.cdf")
    # df_processed = loader.preprocess_data(df)
    # df_with_features = loader.calculate_derived_parameters(df_processed)
    
    print("SWIS Data Loader initialized successfully")
    print(f"Available CDF libraries: SpacePy={SPACEPY_AVAILABLE}, cdflib={CDFLIB_AVAILABLE}")