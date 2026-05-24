# HeartSensorDetails

## Purpose

`HeartSensorDetails` displays connection details and controls for the heart-rate sensor used on the Devices screen.

## Inputs

- `sensorName`: Connected sensor name. When missing, display `--`.
- `batteryPercent`: Sensor battery percentage. When missing, display `--%`.
- `onReconnect`: Called when the Reconnect button is activated.
- `onDisconnect`: Called when the Disconnect button is activated.

## Layout

- The component is displayed as one rounded bordered panel using the app panel styling.
- Sensor details are rendered before the action buttons.
- Sensor details use a semantic definition list.
- The definition list includes:
  - `Sensor`
  - `Battery`
- The sensor name value is displayed as prominent text.
- The battery value is displayed as prominent numeric text followed by `%`.
- Reconnect and Disconnect buttons are displayed below the definition list.
- The buttons are arranged as two equal-width actions.

## Actions

- Reconnect uses the app accent button styling.
- Disconnect uses the app danger button styling.
- Activating Reconnect invokes `onReconnect`.
- Activating Disconnect invokes `onDisconnect`.
- Reconnect and Disconnect must not depend on sensor values being present.

## Storybook Coverage

The component must have Storybook stories for:

- Connected
- Missing Values

The stories should verify displayed definition-list content and action callbacks.
