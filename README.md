# Balancing the Student Life — CSC316 Final Project (Prototype V1)

**Course:** CSC316 — Data Visualization  
**Week 8 Submission:** Prototype V1  
**Team:** *Stressly*  
**Members:**  
- Cynthia Liu — Visualization Lead  
- Ayaan Asif — Front-End & Integration Lead  
- Tahseen Rana — Data Lead  
- Faraz Malik — Quality & Documentation Lead  

---

## 📘 Project Overview
**Theme:** *Stress, Sleep, and Lifestyle Habits: Understanding Student Well-Being*  
This interactive prototype explores how stress relates to emotional well-being, coping strategies, and lifestyle choices among university students. It visualizes survey data (from Kaggle and Figshare) covering stress (PSS-10), anxiety (GAD-7), depression (PHQ-9), sleep, exercise, and coping mechanisms.

The visualization aims to make complex mental-health correlations accessible, allowing users to explore relationships interactively rather than through static graphs.

---

## 🧩 Visualizations Implemented

### 1. Emotion Constellation Triangle *(Novel Design)*
**File:** `ternary.js`  
A ternary plot that maps each student’s normalized Stress, Anxiety, and Depression scores within a triangular space.  
- **Color** encodes combined emotional severity.  
- **Radius** scales by intensity.  
- Linked to the “Coping Garden”: selecting or highlighting coping categories dims unrelated dots.  
- Includes a guided *tour overlay* explaining interpretation steps.

### 2. Coping Strategy Garden
**File:** `garden.js`  
A botanical metaphor that visualizes stress by coping mechanism.  
- Each “flower” represents a coping strategy.  
- **Stem height** → lower average stress = taller stem.  
- **Petal size** → average exercise hours per week.  
- **Color intensity** → frequency of students reporting that strategy.  
- Includes an insight overlay with sequential messages guiding user exploration.

---

## 🧮 Data

**File:** `cleaned_data.csv`  
Merged and cleaned from multiple public datasets on Kaggle/Figshare:  
- *Student Mental Health and Coping Mechanisms*  
- *MHP Anxiety–Stress–Depression Dataset (Bangladesh)*  
- *Student Stress Monitoring Dataset*  

Main columns retained:
| Variable | Description |
|-----------|-------------|
| `stress_score` | PSS-10 total stress score (0–40) |
| `anxiety_score` | GAD-7 anxiety score (0–21) |
| `depression_score` | PHQ-9 depression score (0–27) |
| `sleep_hours` | Average hours of sleep per night |
| `exercise_hours` | Hours of exercise per week |
| `coping_strategy` | Reported coping mechanism |
| `major`, `gender`, `year` | Demographic info |

Outliers (e.g., age > 90) were removed, and missing stress values were dropped.  
All numeric columns were normalized for the triangle view.

---

## 🎛️ Interaction & Controls

**Implemented**
- Dropdown filters for `Year`, `Major`, and `Gender`.  
- Dynamic re-rendering of both views with filtered data.  
- Linked highlighting between the triangle and garden.  
- Tooltip hover details and guided narrative overlays.

**Planned**
- Lasso selection within the triangle to highlight subsets in the garden.  
- Stress simulator predicting scores from sleep, exercise, and coping choices.

---

## 💻 File Structure
```
index.html
css/
 └── style.css
js/
 ├── main.js
 ├── ternary.js
 ├── garden.js
 └── utils.js
data/
 └── cleaned_data.csv
assets/
 └── screenshots/
README.md
```

---

## ⚙️ Setup & Run
1. Place all files in one folder (or deploy to GitHub Pages).  
2. Ensure the CSV is in `/data/cleaned_data.csv`.  
3. Open `index.html` in a browser.  
4. Requires internet access to load D3 v7 from CDN.

---

## 🧠 Storytelling Structure
- **Hook — “The Student Spiral”**  
  “Every student knows the pattern — less sleep, more caffeine, higher stress.”
- **Rising Insights**  
  Data reveals clustering among stress, anxiety, and depression.
- **Main Message**  
  Coping strategies involving activity (exercise, socializing) correlate with lower stress.
- **Solution**  
  Encourages balance — improving mental health through sustainable habits.

---

## ✨ Credits
Built with [D3.js v7](https://d3js.org/).  
Design concept and visuals by *Team Stressly (UofT CSC316, Fall 2025)*.  
Dataset sources: Kaggle, Figshare.  
© 2025 University of Toronto — For academic use only.
