// Dhikr Bar settings: choose position and timing, add / edit / delete dhikr.
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const POSITIONS = ['left', 'center', 'right'];
const POSITION_LABELS = ['Left', 'Center', 'Right'];
const ORDERS = ['sequential', 'random'];
const ORDER_LABELS = ['In order', 'Random'];

export default class DhikrBarPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(560, 720);

        const page = new Adw.PreferencesPage({
            title: 'Dhikr Bar',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        page.add(this._buildDisplayGroup(settings));
        page.add(this._buildListGroup(settings));
    }

    _buildDisplayGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Display',
            description: 'Where the dhikr sits and how often it changes.',
        });

        group.add(this._choiceRow(settings, 'position', 'Top bar position', POSITIONS, POSITION_LABELS));
        group.add(this._choiceRow(settings, 'order', 'Order', ORDERS, ORDER_LABELS));
        group.add(this._spinRow(settings, 'interval', 'Change every (seconds)', 5, 3600, 5));
        group.add(this._spinRow(settings, 'max-length', 'Maximum characters', 10, 80, 1));

        return group;
    }

    _choiceRow(settings, key, title, values, labels) {
        const row = new Adw.ComboRow({
            title,
            model: Gtk.StringList.new(labels),
        });
        const current = values.indexOf(settings.get_string(key));
        row.set_selected(current >= 0 ? current : 0);
        row.connect('notify::selected', () => {
            settings.set_string(key, values[row.get_selected()]);
        });
        return row;
    }

    _spinRow(settings, key, title, min, max, step) {
        const row = new Adw.SpinRow({
            title,
            adjustment: new Gtk.Adjustment({
                lower: min,
                upper: max,
                step_increment: step,
                page_increment: step * 6,
                value: settings.get_int(key),
            }),
        });
        row.connect('notify::value', () => {
            settings.set_int(key, Math.round(row.get_value()));
        });
        return row;
    }

    _buildListGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Dhikr list',
            description: 'Type to edit, then press Enter or the tick. Use the bin to delete.',
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Add a dhikr',
            css_classes: ['flat'],
        });
        const resetButton = new Gtk.Button({
            label: 'Reset list',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: 'Restore the default dhikr list',
        });
        const box = new Gtk.Box({spacing: 6});
        box.append(resetButton);
        box.append(addButton);
        group.set_header_suffix(box);

        let rows = [];

        const rebuild = (focusIndex = -1) => {
            for (const row of rows)
                group.remove(row);
            rows = [];

            const list = settings.get_strv('dhikr-list');
            list.forEach((text, index) => {
                const row = new Adw.EntryRow({
                    title: `Dhikr ${index + 1}`,
                    text,
                    show_apply_button: true,
                });

                row.connect('apply', () => {
                    const updated = settings.get_strv('dhikr-list');
                    updated[index] = row.get_text().trim();
                    settings.set_strv('dhikr-list', updated);
                });

                const deleteButton = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: 'Delete',
                    css_classes: ['flat', 'destructive-action'],
                });
                deleteButton.connect('clicked', () => {
                    const updated = settings.get_strv('dhikr-list');
                    updated.splice(index, 1);
                    settings.set_strv('dhikr-list', updated);
                    rebuild();
                });
                row.add_suffix(deleteButton);

                group.add(row);
                rows.push(row);

                if (index === focusIndex)
                    row.grab_focus();
            });
        };

        addButton.connect('clicked', () => {
            const updated = settings.get_strv('dhikr-list');
            updated.push('New dhikr');
            settings.set_strv('dhikr-list', updated);
            rebuild(updated.length - 1);
        });

        resetButton.connect('clicked', () => {
            settings.reset('dhikr-list');
            rebuild();
        });

        rebuild();
        return group;
    }
}
