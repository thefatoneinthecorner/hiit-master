# SessionController

## Purpose

`SessionController` displays heart sensor connection details and compact active-session control actions in the same rounded panel treatment used by `HeartSensorDetails`.

## Inputs

- `sensorName`: Connected sensor name. When missing, display `--`.
- `batteryPercent`: Sensor battery percentage. When missing, display `--%`.
- `playing`: Whether session playback is currently running. Defaults to true.
- `onBluetooth`: Called when the Bluetooth icon button is activated.
- `onPlay`: Called when the Play icon button is activated.
- `onPause`: Called when the Pause icon button is activated.
- `onStop`: Called when the Stop icon button is activated.

## Layout

- The component is displayed as one rounded bordered panel using the app panel styling.
- Sensor details are rendered before the action buttons.
- Sensor details use a semantic definition list.
- The definition list includes:
  - `Sensor`
  - `Battery`
- The sensor name value is displayed as prominent text.
- The battery value is displayed as prominent numeric text followed by `%`.
- Controls are rendered as four equal icon-button actions in one row.
- The controls use `IconButton`.
- The button icons use the SVG assets:
  - `assets/bluetooth.svg`
  - `assets/play.svg`
  - `assets/pause.svg`
  - `assets/square.svg`
- The icon imagery is decorative; each action exposes its accessible name through the icon button label.

## Actions

- Bluetooth is labelled `Bluetooth`.
- Play is labelled `Play`.
- Pause is labelled `Pause`.
- Stop is labelled `Stop`.
- When `playing` is true, Play is disabled and visually greyed out while Pause is enabled.
- When `playing` is false, Pause is disabled and visually greyed out while Play is enabled.
- Activating each action invokes only its matching callback.
- Disabled Play or Pause controls must not invoke their callbacks.
- Stop uses the danger icon-button variant.

## Storybook Coverage

The component must have a Storybook story for:

- Default
- Missing Values

The stories should verify displayed definition-list content, missing value fallbacks, all four icon buttons, and that each callback is invoked when its action is activated.
