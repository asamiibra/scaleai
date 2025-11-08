# AI Claims Workbench

An AI-assisted prototype for photo-based car damage assessment targeted at **claims agents**.

This prototype is part of a take-home exercise to demonstrate product thinking, AI integration, and rapid prototyping.

## What It Does

1. **Initiate / Load Claim**
   - Enter basic claim details (policy #, claimant, accident date, description).

2. **Upload Damage Photos**
   - Attach one or more images of the damaged vehicle.

3. **Run AI Assessment (Simulated)**
   - Click "Run AI Assessment" to generate a mocked AI response:
     - Detected damaged parts
     - Severity category
     - Cost estimate range
     - Recommended next step (auto-approve / standard review / escalate)

4. **Human-in-the-Loop Actions**
   - The agent can:
     - Approve a preliminary estimate,
     - Request more information,
     - Escalate to a senior adjuster.
   - All actions are explicitly taken by a human.

## Tech Stack

- Pure front-end: **HTML + CSS + JavaScript**
- No backend required.
- AI behavior is simulated to illustrate how a real model API would plug in.

## How to Run

```bash
git clone https://github.com/<your-github-username>/ai-claims-workbench.git
cd ai-claims-workbench
python -m http.server 8000  # or use any static server
