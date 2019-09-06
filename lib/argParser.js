const arg = require('arg');

class ArgParser {
    constructor() {
        this._opts = {};
        this._names = {};
        this._helpText = null;
    }

    flag(name, ...names) {
        let type = names.pop();
        let mainName = names.shift();
        this._opts[mainName] = type;
        this._names[mainName] = name;
        if(names.length > 0) {
            names.forEach(n => {
                this._opts[n] = mainName;
            });
        }
        return this;
    }

    string(name, ...names) { return this.flag(name, ...names, String); }
    bool(name, ...names) { return this.flag(name, ...names, Boolean); }
    help(helpText, ...names) {
        this._helpText = helpText;
        return this.bool('help', ...names);
    }

    parse(argv = null) {
        let config = { permissive: true };
        if(argv !== null) { config.argv = argv; }
        let options = arg(this._opts, config);
        let rv = {};
        Object.keys(options).forEach(k => {
            rv[k] = options[k];
            if(this._names.hasOwnProperty(k)) {
                rv[this._names[k]] = options[k];
            }
        });
        if(this._helpText && rv.help) {
            console.log(this._helpText);
            process.exit(0);
        }
        return rv;
    }

    get argv() {
        return this.parse();
    }
}

const argParser = () => new ArgParser();

module.exports = {
    argParser
};
