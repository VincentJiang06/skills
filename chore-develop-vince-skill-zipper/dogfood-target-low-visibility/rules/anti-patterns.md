# Anti-Patterns Checklist

When designing or auditing, check against every item on this list.
Any match = violation that must be fixed.

## Visual & Feedback

- Small icon-only buttons
- Color as the only state indicator
- Long toast as sole feedback
- Low-contrast gray text
- Spinner as only offline feedback
- Error message: "Invalid" (must include action instruction)

## Interaction

- Select-to-submit without confirmation
- Dangerous button adjacent to normal button
- Undo hidden in menus
- Small radio / checkbox as primary selection
- Complex gestures for critical actions (swipe, pinch, drag)
- Deep navigation (>3 levels)

## Layout

- Button position changes between screens
