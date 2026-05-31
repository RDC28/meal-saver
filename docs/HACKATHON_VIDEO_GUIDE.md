# MealSaver Hackathon Demo Video Guide

Target duration: `03:00`  
Format: `1920x1080`, `16:9`, `30 fps`  
Style: recorded screen demo with a separately recorded voice-over

## Demo Strategy

Use prepared data instead of creating and completing a real donation during the final take. The video should feel like one continuous workflow, but the recording can use pre-opened tabs and clean cuts between roles.

The strongest story is:

1. A donor lists surplus food.
2. MealSaver finds compatible NGOs nearby.
3. An NGO accepts and tracks the pickup.
4. A secure OTP and safety checklist protect the handover.
5. Admins can intervene when a donation is urgent.
6. Completed deliveries become measurable impact.

## Important Recording Note

Do not click the final button on `/delivery/confirm` during the recording. The repository contains the final delivery API at `/api/deliveries`, but the current confirmation screen calls the pickup-completion endpoint. Show the OTP handover screen briefly, then cut to a pre-completed account on `/impact`.

## Prepare Before Recording

Create or identify these records:

- One donor account with completed donation history and visible impact metrics.
- One verified NGO account with nearby donations.
- One urgent donation expiring soon.
- One active pickup in the `in_progress` state with an OTP already generated.
- One admin account with pending verifications or recent donations.

Open these tabs before recording:

| Tab | Route | Purpose |
| --- | --- | --- |
| 1 | `/` | Opening and closing hero |
| 2 | `/donor/dashboard` | Donor overview |
| 3 | `/donor/donations/new` | Donation form |
| 4 | `/ngo/nearby` | Nearby matching and filters |
| 5 | `/ngo/pickups` | Accepted pickups |
| 6 | `/pickup/verify?id=<STAGED_PICKUP_ID>` | OTP and safety checklist |
| 7 | `/admin` | Platform oversight |
| 8 | `/admin/emergency` | Urgent handling |
| 9 | `/admin/matching` | Manual assignment |
| 10 | `/impact` | Outcome metrics |

Use separate browser profiles or prepared recordings for donor, NGO, and admin roles. This avoids showing login screens or wasting time switching accounts.

## Recording Setup

- Record the browser only. Hide bookmarks, notifications, personal tabs, and password-manager popups.
- Set browser zoom to `90%` or `100%` and keep it unchanged throughout.
- Use a clean cursor. Move deliberately and stop moving while speaking about a screen.
- Avoid typing full form values in real time. Show the completed form and scroll through the important fields.
- Do not display a real OTP. Leave the OTP fields blank or blur the digits in editing.
- Record the screen first, then record the voice-over while watching the edited screen capture.
- Leave a short pause between sections so cuts feel intentional.
- Add quiet background music only if it does not compete with the narration.

## Timed Shot List And Script

| Time | Screen and action | Narration |
| --- | --- | --- |
| `00:00-00:12` | Start on `/`. Hold on the MealSaver hero and the two role buttons. | Every day, good food is discarded while nearby communities still need meals. MealSaver closes that gap by turning surplus food into a fast, accountable rescue workflow. |
| `00:12-00:27` | Scroll slightly to show the `Fast Matching`, `Safe Pickup`, and `Transparent Impact` cards. | Food businesses post extra food, verified NGOs discover compatible pickups nearby, and both sides track the handover through a single platform. The goal is simple: rescue more, waste less. |
| `00:27-00:48` | Cut to `/donor/dashboard`. Pause over the stat cards, then open `/donor/donations/new`. | Let's start as a donor. The dashboard summarizes active donations, completed deliveries, meals saved, and food waste reduced. Creating a listing captures food type, condition, quantity, expiry, contact details, and the exact pickup location. |
| `00:48-01:05` | Scroll the prepared donation form. Pause on expiry and the location picker. Do not submit during the final take. | Cooked food with a short shelf life is marked urgent automatically. Once the listing is submitted, MealSaver starts matching in the background instead of waiting for manual coordination. |
| `01:05-01:26` | Cut to `/ngo/nearby`. Hover over an urgent listing, show distance, filters, and the `Accept` button. | On the NGO side, nearby donations are organized by urgency and distance. Teams can search, filter, review pickup windows, and accept a suitable donation. Eligibility checks cover verification, food preferences, service area, and capacity. |
| `01:26-01:43` | Cut to `/ngo/pickups`. Hold on an accepted pickup with its address, contact details, and status. | Acceptance creates a tracked pickup assignment with the donor address, contact information, timing, and status. This gives the NGO a clear operational checklist instead of fragmented calls and messages. |
| `01:43-02:03` | Cut to `/pickup/verify?id=<STAGED_PICKUP_ID>`. Tick the three checklist items. Leave OTP blank or blur it. | At collection, the handover is protected by a six-digit OTP and a visual safety checklist. The OTP ensures that the correct NGO receives the correct donation, while the checklist keeps accountability part of the workflow. |
| `02:03-02:20` | Cut to `/admin`. Show platform cards, then cut to `/admin/emergency` and briefly `/admin/matching`. | For exceptional cases, admins have oversight. They can verify organizations, monitor donation status, manually assign urgent pickups, and intervene when food is approaching expiry. Automation handles the common path; people can still resolve edge cases. |
| `02:20-02:39` | Keep `/admin/matching` visible or add a simple text overlay: `PostGIS matching: verified + compatible + nearby + capacity`. | Under the hood, a PostGIS query filters verified NGOs by distance, category compatibility, and capacity, then sorts nearest first. Completed deliveries generate impact records so operational actions become measurable outcomes. |
| `02:39-02:56` | Cut to `/impact` using the prepared completed account. Pause over the four stat cards and recent activity. | Here, the impact dashboard brings that together: meals saved, kilograms rescued, carbon impact avoided, people served, and a history of completed donations. Each number is tied to a real delivery record. |
| `02:56-03:00` | Cut back to `/`. Hold on the hero. Add a small overlay with the project URL if available. | MealSaver: rescue surplus food, feed more people, and make every handover count. |

## Editing Checklist

- Keep the final export between `02:58` and `03:00`.
- Use hard cuts or short crossfades. Avoid decorative transitions.
- Add small role labels when switching context: `Donor`, `NGO`, `Admin`.
- Use one architecture overlay at `02:20`: `PostGIS matching: verified + compatible + nearby + capacity`.
- Blur personal phone numbers, email addresses, and any OTP digits.
- Import `docs/mealsaver-hackathon-demo.srt` into the editor or upload it to YouTube after publishing.
- Watch once without audio to confirm the UI alone tells the story.
- Watch once with subtitles enabled to catch timing or spelling issues.

## Optional Presenter Intro

If the hackathon requires a spoken team introduction, replace the first sentence with:

> We built MealSaver, a platform that rescues surplus food before it becomes waste and routes it to verified NGOs nearby.

Keep the introduction under `8` seconds so the product remains the focus.
