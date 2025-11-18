# Data Sources and Synchronization Guide

## Overview
The CME Detection System integrates three primary data sources to provide comprehensive space weather monitoring and CME detection capabilities. When you click "Sync Now", the system fetches real-time data from these sources.

## Data Sources

### 1. ISSDC (Indian Space Science Data Centre)
**Organization**: ISRO (Indian Space Research Organisation)
**Purpose**: Primary data source for Aditya-L1 mission SWIS instrument data

#### What is SWIS?
- **SWIS**: Solar Wind Ion Spectrometer
- **Mission**: Aditya-L1 (India's first solar mission)
- **Location**: L1 Lagrange point (1.5 million km from Earth)
- **Launch**: September 2, 2023

#### Data Types:
- **SWIS Level-2 Data**: Calibrated particle measurements
- **Particle Flux**: Proton and ion flux measurements
- **Solar Wind Parameters**: Velocity, density, temperature

#### Technical Details:
- **Data Volume**: ~2GB per day
- **Update Frequency**: 10-minute cadence
- **Coverage**: Continuous monitoring since operational
- **Quality**: High-precision, calibrated scientific data

#### Real Data Usage:
When you click "Sync Now" for ISSDC:
- System connects to ISSDC data servers
- Downloads latest SWIS Level-2 CDF files
- Processes particle flux, velocity, density, and temperature data
- Applies quality filters and calibration
- Stores processed data for CME detection analysis

---

### 2. CACTUS CME Database
**Organization**: Royal Observatory of Belgium (ROB)
**Purpose**: Computer Aided CME Tracking catalog and validation

#### What is CACTUS?
- **CACTUS**: Computer Aided CME Tracking
- **Data Source**: SOHO/LASCO coronagraph images
- **Coverage**: Automated CME detection since 1996
- **Specialty**: Halo CME identification and tracking

#### Data Types:
- **CME Events Catalog**: Comprehensive CME database
- **Halo CME Catalog**: Full and partial halo events
- **Event Properties**: Speed, angular width, source location

#### Technical Details:
- **Data Volume**: ~50MB per month
- **Update Frequency**: Daily updates
- **Coverage**: Global CME events
- **Accuracy**: 85-90% detection rate for significant CMEs

#### Real Data Usage:
When you click "Sync Now" for CACTUS:
- System scrapes latest CME catalog from CACTUS database
- Filters for halo CMEs (angular width > 270°)
- Extracts event properties (speed, width, source location)
- Calculates Earth arrival times
- Cross-validates with SWIS data for detection accuracy

---

### 3. NASA SPDF (Space Physics Data Facility)
**Organization**: NASA Goddard Space Flight Center
**Purpose**: Multi-mission space physics data repository

#### What is SPDF?
- **SPDF**: Central repository for space physics data
- **Missions**: ACE, WIND, DSCOVR, Parker Solar Probe, and more
- **Data Format**: CDF (Common Data Format)
- **Access**: Real-time and historical data

#### Data Types:
- **CDF Files**: Standardized space physics data
- **Solar Wind Data**: Multi-spacecraft measurements
- **Magnetic Field**: Interplanetary magnetic field (IMF)

#### Technical Details:
- **Data Volume**: ~1GB per day
- **Update Frequency**: 1-minute cadence
- **Coverage**: Multiple spacecraft perspectives
- **Quality**: Cross-validated, multi-mission data

#### Real Data Usage:
When you click "Sync Now" for NASA SPDF:
- System queries SPDF CDAWeb API
- Downloads magnetic field data (Bx, By, Bz components)
- Retrieves solar wind parameters from multiple spacecraft
- Identifies magnetic field rotations (CME signatures)
- Provides complementary data to SWIS measurements

---

## How Sync Now Works

### Real-Time Data Synchronization Process:

1. **Connection Establishment**
   - System establishes secure connections to data servers
   - Authenticates using API keys (where required)
   - Tests connectivity and server availability

2. **Data Retrieval**
   - Downloads latest data files (CDF, text, or API responses)
   - Handles different data formats and protocols
   - Implements retry logic for network issues

3. **Data Processing**
   - Parses and validates incoming data
   - Applies quality filters and range checks
   - Converts to standardized internal format
   - Calculates derived parameters

4. **Storage and Analysis**
   - Stores processed data in PostgreSQL database
   - Triggers automatic CME detection algorithms
   - Updates system status and metrics
   - Generates alerts for significant events

### Data Quality Validation:

- **Range Checks**: Validates physical parameter ranges
- **Gap Detection**: Identifies and flags data gaps
- **Cross-Validation**: Compares data across sources
- **Quality Metrics**: Calculates completeness and accuracy scores

### Real-Time Updates:

- **ISSDC**: Updates every 10 minutes with new SWIS data
- **CACTUS**: Daily updates with new CME detections
- **NASA SPDF**: Near real-time (1-minute) magnetic field data

## Benefits of Real Data Integration

### 1. **Enhanced Detection Accuracy**
- Multiple data sources provide cross-validation
- Reduces false positives through correlation analysis
- Improves confidence scores for CME detections

### 2. **Comprehensive Coverage**
- 24/7 monitoring from multiple perspectives
- Backup data sources ensure continuity
- Historical data for baseline establishment

### 3. **Scientific Validation**
- Compare Aditya-L1 data with established missions
- Validate new instruments against proven sources
- Contribute to international space weather efforts

### 4. **Operational Benefits**
- Real-time alerts for space weather events
- Automated data processing and analysis
- Standardized data formats for easy integration

## Data Usage in CME Detection

The synchronized data feeds into the CME detection algorithm:

1. **SWIS Data**: Primary detection through particle signatures
2. **CACTUS Data**: Validation and correlation with solar observations
3. **NASA SPDF**: Magnetic field analysis and arrival time prediction

This multi-source approach provides robust, scientifically validated CME detection capabilities for space weather monitoring and research.

## System Requirements

- **Internet Connection**: Required for real-time data access
- **Storage**: ~10GB recommended for 30 days of data
- **Processing**: Multi-core CPU for real-time analysis
- **Database**: PostgreSQL for data storage and retrieval

## Troubleshooting

If sync fails:
1. Check internet connectivity
2. Verify server status (data sources may have maintenance windows)
3. Check logs for specific error messages
4. Retry sync operation
5. Contact system administrator for persistent issues

---

*Last Updated: August 29, 2025*
*System Version: v2.1.3*
