# Splat Viewer Issues and User Requests

This document outlines the current problems with the 3D Splat Viewer and the specific requests for fixing them.

## 1. FOV (Field of View) Issue
- **Current State:** The default FOV is computing/falling near 22-24.6°.
- **Problem:** The model looks bad at the default 22-24° FOV. 
- **User Preference:** The "sweet spot" is 15° FOV. At 15°, the model looks much better and accurate.
- **Goal:** The default FOV upon loading should effectively look like the 15° setting, rather than calculating out to 24°.
- **Note:** Previous attempts to fix this either moved the goalposts (making 8° look like 15°) or failed to resolve the visual discrepancy. The core FOV calculation/scaling or metadata extraction needs a definitive fix, even if it requires remaking the entire FOV logic.

## 2. Settings Panel / UI Issue
- **Current State:** The settings bar at the bottom (or the settings panel itself) becomes unresponsive after the model loads.
- **Workaround Required:** The panel currently only works if the user reloads the page and clicks the setting tab to open it *before* the model finishes loading.
- **Goal:** Fix the UI so that the Settings bar/panel is fully clickable and functional at all times, especially after the 3D model has fully loaded.

## 3. Experimental Features Warning
- **DO NOT** enable the "enhanced quality" option.
- **DO NOT** enable "Depth Anything V2" option. 
- Both of these are experimental and should remain disabled/opt-in.

## Summary Objective
Create a definitive fix for the FOV visual mismatch and the unclickable settings UI. Remake the affected components entirely if necessary.
