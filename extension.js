// Dhikr Bar: shows one dhikr at a time in the GNOME top bar.
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// Where each choice goes in the panel. Index -1 means "after the items already there".
const BOX_INDEX = {left: -1, center: -1, right: 0};

function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default class DhikrBarExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._index = -1;
        this._timerId = 0;
        this._indicator = null;

        this._addIndicator();
        this._showNext();
        this._startTimer();

        this._settingsIds = [
            this._settings.connect('changed::position', () => {
                this._removeIndicator();
                this._addIndicator();
                this._refreshText();
            }),
            this._settings.connect('changed::interval', () => this._startTimer()),
            this._settings.connect('changed::dhikr-list', () => this._refreshText()),
            this._settings.connect('changed::max-length', () => this._refreshText()),
        ];
    }

    disable() {
        for (const id of this._settingsIds ?? [])
            this._settings.disconnect(id);
        this._settingsIds = null;

        this._stopTimer();
        this._removeIndicator();
        this._settings = null;
    }

    _addIndicator() {
        const position = this._settings.get_string('position');

        // "true" = no popup menu, this is a plain label button.
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, true);
        this._label = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._indicator.add_child(this._label);

        Main.panel.addToStatusArea(
            this.uuid, this._indicator, BOX_INDEX[position] ?? -1, position);
    }

    _removeIndicator() {
        this._indicator?.destroy();
        this._indicator = null;
        this._label = null;
    }

    _startTimer() {
        this._stopTimer();
        const seconds = this._settings.get_int('interval');
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            this._showNext();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
    }

    _list() {
        return this._settings.get_strv('dhikr-list')
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }

    // Pick the next index (in order, or random but never the same one twice).
    _showNext() {
        const list = this._list();
        if (list.length === 0) {
            this._index = -1;
        } else if (this._settings.get_string('order') === 'random' && list.length > 1) {
            let next;
            do {
                next = Math.floor(Math.random() * list.length);
            } while (next === this._index);
            this._index = next;
        } else {
            this._index = (this._index + 1) % list.length;
        }
        this._refreshText();
    }

    // Re-draw the current dhikr without moving to the next one.
    _refreshText() {
        if (!this._label)
            return;
        const list = this._list();
        if (list.length === 0) {
            this._label.set_text('');
            return;
        }
        if (this._index < 0 || this._index >= list.length)
            this._index = 0;
        const max = this._settings.get_int('max-length');
        this._label.set_text(truncate(list[this._index], max));
    }
}
