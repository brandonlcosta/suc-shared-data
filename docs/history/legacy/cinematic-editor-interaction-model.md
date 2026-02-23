## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

?? CINEMATIC EDITOR — INTERACTION MODEL SPEC
SUC-OS Cinematic Builder (Single Route)

Version: 1.0
Scope: Studio (Authoring Layer Only)
Constraint: Single-route cinematic authoring
Status: Post Phase 3, Pre Overlay System Completion

1?? Design Philosophy

The Cinematic Editor is not:

A form-based configuration tool

A generic map editor

A traditional video editor

It is:

A spatial narrative editor where terrain is the timeline and overlays are composable story elements.

The route is the footage.
Distance is the timecode.
Elevation is the waveform.
Overlays are narrative beats.

The interaction model must:

Feel creative, not bureaucratic

Be spatially intuitive

Reduce cognitive load

Encourage experimentation

Preserve deterministic output

Never violate SUC-OS invariants

2?? Core Surfaces

The editor has four primary surfaces:

A. Left Panel — Inspector

Contextual property editor.

Displays:

Selected overlay properties

Selected POI properties

Plan-level settings (collapsed by default)

Metric configuration

Camera configuration

It must never be the primary creation surface.

B. Center Surface — Map Canvas

Primary spatial authoring surface.

Responsibilities:

Render route

Render POIs

Render active overlays

Render camera path preview

Accept spatial input

Must support:

Click-to-create POI

Drag POI along route

Context menu (right-click)

Hover affordances

Snap-to-route behavior

C. Bottom Surface — Timeline + Elevation

Primary temporal authoring surface.

Responsibilities:

Elevation waveform backbone

Multi-lane overlay tracks

Drag, resize, snap

Overlay stacking

Conflict validation

Distance = X axis
Elevation = waveform
Overlays = blocks

D. Right Panel — Preview Engine

Simulation only.

Playback

Scrubbing

Camera debug

Active overlays

Frame performance

Never mutates canonical state.

3?? Overlay System Model

All cinematic elements are Overlays.

Overlay types:

caption

poi

camera

speed

metric

elevation-highlight

custom-svg (future)

Each overlay:

Has lane assignment

Has startMile / optional endMile

May be spatially attached (poiId)

Has type-specific config

Overlay creation and manipulation must feel consistent regardless of type.

4?? Creation Model (Critical)

The system must support three creation flows:

4.1 Map-Driven Creation
Right-click on Map

Menu:

Add Caption Here

Add POI

Aid Station

Summit

Crew

Water

Custom

Add Metric Overlay

Add Camera Keyframe

Add Elevation Highlight (from selection)

Behavior:

POI attaches to route index.

Caption creates time block at that mile.

Metric overlay defaults to short region around click.

Elevation highlight requires drag selection (see below).

4.2 Timeline-Driven Creation
Right-click on Timeline (empty region)

Menu:

Add Caption

Add POI

Add Metric

Add Elevation Highlight

Add Camera Keyframe

StartMile = cursor location.

Overlay placed in appropriate lane.

4.3 Drag & Drop Creation (Overlay Palette)

Left panel includes:

Overlay Library:

Caption

POI

Metric

Elevation Highlight

Camera

User can drag onto:

Map ? spatial anchor

Timeline ? temporal anchor

This mirrors Figma / After Effects mental model.

5?? Manipulation Model

All overlays must support:

5.1 Timeline Interactions

Drag center ? move block

Drag left handle ? adjust start

Drag right handle ? adjust end

Snap to:

Summit anchors

Valley anchors

Block edges

POI anchors

Overlap rules:

No overlap within lane

Cross-lane overlap allowed

Conflict displayed inline.

5.2 Map Interactions
POI

Drag along route

Snap to nearest route index

Attached overlays update automatically

Elevation Highlight

Drag across waveform to create

Resize via timeline handles

5.3 Context Menu on Overlay

Right-click block:

Edit

Duplicate

Delete

Detach from POI

Convert type (if compatible)

No modal dialogs required unless editing complex config.

6?? Elevation Highlight Model

User drags across waveform.

System creates:

type: elevation-highlight
startMile
endMile
style: bracket | shaded | gradient

Preview rendering:

Highlight region

Show gain badge (optional)

Use existing elevation chart rendering system

No custom rendering fork allowed.

7?? Metric Overlay Model

Metric overlays are data-bound.

Supported metrics:

Distance

Elevation gain

Grade %

Segment duration

Overlay stores:

metricType

displayStyle

scope (segment | cumulative | instant)

Computed in preview and broadcast.

Never store computed values in canonical.

8?? Visual Language & Design System

Must reuse:

Existing route-intel panel components

Existing elevation chart rendering

Existing SVG POI icon registry

Shared style tokens

Icons:

Monochrome

White

Consistent stroke width

Shared with route viewer

No inline SVG duplication.

9?? Interaction Feedback Rules

The editor must visually communicate:

Snap activation

Overlap conflict

Attachment link

Active overlay during playback

Hover state on route

Drag state

No silent state transitions.

?? Keyboard Interaction Model

Minimum:

Space ? Play/Pause

S ? Split

D ? Duplicate

Delete ? Remove

Arrow keys ? Nudge

Cmd/Ctrl + Z ? Undo

Cmd/Ctrl + Shift + Z ? Redo

Keyboard interaction must be documented and tested.

11?? Performance Constraints

No heavy recompute on drag.

Overlay state must be memoized.

Elevation data preprocessed.

Preview frame <16ms compute target.

No canonical mutation during preview.

12?? Non-Goals

The interaction model explicitly excludes:

Multi-route synchronization

Tier-based playback

Sponsor system

AI narration (future)

Collaborative editing (future)

Broadcast compile changes

13?? Definition of a “Complete” Interaction Layer

The editor feels complete when:

A user can create a full cinematic without touching raw forms.

All overlays can be created via map or timeline.

Dragging feels fluid.

Elevation is part of the story.

Preview gives immediate feedback.

No confusion about “how do I add something?”

14?? Strategic Intent

This interaction model is designed to evolve into:

A composable spatial storytelling engine.

Overlay abstraction enables:

AI-assisted segmentation

Terrain intelligence

Sponsor placements

Live data overlays

Multi-format export styling

But those are future phases.

This document defines the clean foundation.

