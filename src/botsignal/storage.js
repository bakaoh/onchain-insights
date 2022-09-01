const fs = require("fs");

class Storage {
    constructor(file) {
        this.file = file;
        this.setting = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file)) : {};
    }

    save() {
        fs.writeFileSync(this.file, JSON.stringify(this.setting, null, 2));
    }

    all() {
        return this.setting;
    }

    get(name) {
        if (name) return this.setting[name];
        return this.setting;
    }

    set(name, value) {
        this.setting[name] = value;
        this.save();
    }

    add(name, value) {
        if (!this.setting[name]) this.setting[name] = [];
        this.setting[name].push(value);
        this.save();
    }
}

module.exports = Storage;