# Libraries served from this site

The skin check loads these from here, not from a CDN, so a file changed on a CDN never runs on a page with the camera open.

| Folder | Package | Licence | Used for |
| --- | --- | --- | --- |
| tasks-vision, face_landmarker.task | @mediapipe/tasks-vision (copied from the Apex PMS face planner) | Apache-2.0 | finding the face, 478 points and the head turn |
| face-api | @vladmandic/face-api 1.7.15 (dist/face-api.esm.js, model/age_gender_model) | MIT | the age guess behind skin age |

The readings in assets/scan (skin.js, factors.js, geometry.js) come from the Apex Surgery face analysis.
