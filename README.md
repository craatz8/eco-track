# 🌍 EcoTrack

EcoTrack is a full-stack web application designed to help users monitor, visualize, and offset their personal carbon footprint. By tracking daily activities and planting virtual trees in a 3D geographical ledger, users can set sustainability goals and watch their environmental impact improve over time.

[EcoTrack Dashboard Screenshot]

## 🚀 Tech Stack
* **Frontend:** React 18, Tailwind CSS, HTML5
* **Backend:** Python, Flask
* **Database:** MySQL
* **Data Viz & Mapping:** Chart.js, Three.js, Nominatim (OpenStreetMap) API

## ✨ Features

### 📊 Dashboard
The central hub to track your carbon footprint. You can log various weekly activities which correspond to specific amounts of CO2 emitted, securely stored in the database. 
* Set personalized weekly emission goals.
* Edit or delete past activity logs.
* View history dynamically via custom time filters.

### 🌳 My Forest 
An interactive 3D globe where you can plant virtual trees to offset your emissions.
* Plant a tree in any global location using integrated location search (City/State) or exact GPS coordinates.
* Track the species, date planted, and real-time age of the tree.
* The 3D globe instantly updates to render an SVG marker at your exact chosen coordinates. Click any tree marker to manage or edit its entry.

### 👤 Profile Page
A comprehensive analytics dashboard for deep diving into your carbon history.
* **Impact Summary:** View total activities logged and projected month-end emissions based on your current pace.
* **Achievements:** Unlock gamified milestones based on your tracking and planting habits.
* **Impact Analytics:** Visualize your CO2 production over time with a dynamic graph. Apply multiple filters to view data at different granularities (Days, Months, Years) or toggle between cumulative and individual activity views.
* **Forest Ledger:** A detailed table view of all trees planted, allowing for quick coordinate or species edits.

### 📖 User Guide
A built-in educational resource that provides in-depth explanations of the CO2 metrics and the environmental impact of each trackable activity.

## 🛠️ Local Setup & Installation

**1. Clone the repository**
```bash
git clone [https://github.com/craatz8/eco-track.git](https://github.com/craatz8/eco-track.git)
cd eco-track
```

*** Ran Using phpMyAdmin ***

### Install Dependencies
pip install -r requirements.txt

### Run Application
python app.py