import {
  isBoolean,
  isString,
  isObject,
  isArray,
  isNumber,
  isFunction,
  isColor,
} from "wtf-is-this";

const ref = (obj, str) => {
  if (isString(str) && isObject(obj)) {
    str = str.split(".");

    for (let i = 0; i < str.length; i++) {
      obj = obj[str[i]] ? obj[str[i]] : obj[str[i]] === 0 ? 0 : { empty: true };
    }
    if (obj && obj.empty) return null;
    return obj;
  }
  return null;
};

class ThemeMiner {
  constructor(props = {}) {
    this.setProps(props);

    this.key = this.key.bind(this);
    this.vars = this.vars.bind(this);
    this.handlePropTypes = this.handlePropTypes.bind(this);

    this.style = this.style.bind(this);
    this._ = this._.bind(this);
    this.scoped = this.scoped.bind(this);
    this.active = this.active.bind(this);
    this.mixin = this.mixin.bind(this);
    this.calc = this.calc.bind(this);

    this.properties = this.properties.bind(this);
    this.closest = this.closest.bind(this);

    this.matchCondition = this.matchCondition.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.cond = this.cond.bind(this);
  }

  setProps(props = {}) {
    const theme = props.theme || {};

    const options = {
      paletteKey: "palette",

      properties: [],
      useOptions: true,
      useVariants: true,
      useTransient: true,
      activeKey: "active",
      operators: {
        transient: "$",
        nin: " nin ",
        in: " in ",
        ne: " != ",
        eq: " == ",
        gt: " > ",
        gte: " >= ",
        lt: " < ",
        lte: " <= ",
        nset: "!",
        false: "!!",
        true: "==",
      },
      ...props.options,
    };

    const interactives = {
      ...props.interactives,
    };

    let __interactives = {};

    Object.keys(interactives).forEach((k) => {
      __interactives[k] = theme[k];
    });

    this.props = {
      keys: {
        theme: Object.keys(theme),
        interactives: Object.keys(interactives),
      },
      theme: {
        ...theme,
        __interactives,
      },
      options,
      interactives,
    };

    this.mixins = {};

    if (props.mixins) {
      Object.keys(props.mixins).forEach((m) => {
        this.mixins[m] = props.mixins[m];
      });
    }
  }

  /*
    INTERNAL KEY RESOLVER
    Generates ui key.
  */
  key(i) {
    const { options } = this.props;
    return options.useTransient ? `${options.operators.transient}${i}` : i;
  }

  /*
    INTERNAL VARIABLE COLLECTOR
    Collects ui props by key.
  */
  vars(key, props, active) {
    const { theme, options } = this.props;
    let prepared = {};

    if (theme[key]) {
      const keys = Object.keys(active);
      for (const k in theme[key]) {
        if (keys.includes(k)) {
          let a = active[k];

          if (a) {
            if (a.variant) {
              prepared[k] = ref(theme, `${key}.${k}.${a.key}`) || {};
              prepared[k][options.activeKey] = ref(
                theme,
                `${key}.${k}.${a.key}.${a.variant}`,
              );
            } else {
              prepared[k] = ref(theme, `${key}.${k}.${a.key}`);
            }
          }
        } else {
          prepared[k] = theme[key][k];
        }
      }
    }

    return prepared;
  }

  /*
    INTERNAL PROP HANDLER
    Handles template literal, string, function inputs.
  */
  handlePropTypes(p, callback) {
    if (p) {
      if (isArray(p)) {
        // handle unit as literal
        return (ps) => `${callback(ps)}${p[0]}`;
      } else if (isString(p)) {
        // handle unit as string
        return (ps) => `${callback(ps)}${p}`;
      } else if (isFunction(p)) {
        // handle function callbacks
        return (ps) => p(callback(ps));
      } else {
        return callback(p);
      }
    }
  }

  /*
    ACTIVE HELPER
    Resolves all interactives active states.
    Examples:
    Theme.active(this.props)
  */
  active(props = {}) {
    const { interactives, options, keys } = this.props;

    let active = {};

    keys.interactives.forEach((k) => {
      let i = interactives[k];

      let value = props[this.key(k)];

      active[k] = {};

      if (options.useOptions) {
        if (i.options) {
          i.options.forEach((o) => {
            if (props[this.key(o)]) active[k].key = o;
          });
        }
      }
      if (value) {
        active[k].key = value;
      }

      if (!active[k].key) {
        active[k].key = i.default;
      }

      if (i.variants) {
        if (options.useVariants) {
          i.variants.options.forEach((o) => {
            if (props[this.key(o)]) active[k].variant = o;
          });
        }

        if (props[this.key(i.variants.key)])
          active[k].variant = props[this.key(i.variants.key)];

        if (!active[k].variant) active[k].variant = i.variants.default;
      }
    });
    return active;
  }

  /*
    STYLE HELPER
    Resolves and get props of given key.
    Examples:
    Theme.style(`buttons.size.padding`, ({ button, theme, active, props }) => {})
  */
  style(input, keys = this.props.keys.theme) {
    const { theme } = this.props;
    let type;

    if (isArray(input)) {
      type = "array";
      input = input[0];
    } else if (isString(input)) {
      type = "string";
      input = input;
    } else if (isFunction(input)) {
      type = "function";
      input = input;
    } else {
      input = input;
    }

    return (props) => {
      let x = props;
      // check if this props is already styled.
      if (!props.__generated) {
        let active = {};
        let vars = {};

        // anaylize key and get optimized props
        let scope;
        if (type == "array" || type == "string") {
          // use prefix if the parent key is in interactives
          if (theme.__interactives[input.split(".")[0]]) {
            input = `__interactives.${input}`;
          }
          scope = input;
        }

        if (scope) {
          scope = scope.split(".")[0];
          if (theme[scope]) keys = scope;

          if (scope == "props") keys = 0;
          if (scope == "theme") keys = 0;
        }

        if (keys) {
          active =
            !props._disableCache && props.__active
              ? props.__active
              : this.active(props);
          if (isArray(keys)) {
            keys.forEach((k) => (vars[k] = this.vars(k, props, active)));
          } else if (isString(keys)) {
            vars[keys] = this.vars(keys, props, active);
          }
        }

        x = { ...vars, theme, active, props, __generated: true };
      }

      if (type == "array" || type == "string") {
        return ref(x, input);
      } else if (type == "function") {
        return input(x);
      } else {
        return input;
      }
    };
  }

  /*
    GENERAL HELPER
    Does same with style helper with unit support
    Examples:
    _`buttons.size.padding`
    _`active.variant.key`
    _`theme.spacing.micro`
    _`buttons.size.padding``px`
    _`buttons.size.padding`(padding => {})
  */
  _(key) {
    return (props) => this.handlePropTypes(props, this.style(key));
  }

  scoped(s) {
    const resolve = (s, k) => {
      let scope = s;
      let key = isArray(k) ? k[0] : k;
      let parent = key.split(".")[0];
      if (["theme", "props", "active"].includes(key.substr(0, parent.length))) {
        key = key.substr(parent.length + 1, key.length);
        scope = parent;
      }
      return { scope, key };
    };

    return {
      _: (k) => {
        const { scope, key } = resolve(s, k);
        return this._(`${scope}.${key}`);
      },
      mixin: (mixin, ...args) => {
        return (k) => {
          const { scope, key } = resolve(s, k);
          return this.mixin(mixin, ...args)(`${scope}.${key}`);
        };
      },
    };
  }

  /*
    MIXIN HELPER
    Allows usage of prop based mixins.
    Examples:
    mixin("multiply", 2)`button.size.padding`
    mixin("multiply", 2)`button.size.padding``px`
    mixin("multiply", 2)`button.size.padding`(padding => {})
  */
  mixin(mixin, ...args) {
    return (key) => {
      return (props) => {
        const run = (p) => {
          return this.mixins[mixin](this.style(key)(p), ...args);
        };
        return this.handlePropTypes(props, run);
      };
    };
  }

  /**
    PROPERTIES HELPER
    Collects all ui related properties from React props, * to make easy and clean passing to styled-components.
    Examples:
    Theme.properties(this.props)
  */
  properties(props = {}, others = []) {
    const { interactives, options } = this.props;
    let keys = [];

    Object.keys(interactives).forEach((key) => {
      let i = interactives[key];
      keys = [...keys, key];

      if (options.useOptions) {
        keys = [...keys, ...i.options];
        if (i.variants) {
          keys = [...keys, i.variants.key, ...i.variants.options];
        }
      }
    });

    keys = keys.map((i) => this.key(i));
    keys = [...keys, ...options.properties, ...others];

    let newProps = {};

    keys.forEach((k) => {
      if (props[k] != undefined) {
        if (isBoolean(props[k])) {
          if (props[k]) {
            newProps[k] = props[k];
          }
        } else {
          newProps[k] = props[k];
        }
      }
    });

    return newProps;
  }

  /*
    CLOSEST HELPER
    Resolves closest inteactives' option based on given key.
    Examples:
    closest(this.ui.active.size.key, -2)
  */
  closest(key, value, change, variant) {
    const { interactives } = this.props;

    let so = interactives[key].options;
    if (variant) {
      so = interactives[key].variants.options;
    }

    let idx = so.indexOf(value);

    if (idx > -1) {
      if (change > 0) {
        return idx + change >= so.length ? so[so.length - 1] : so[idx + change];
      } else {
        return idx + change < 0 ? so[0] : so[idx + change];
      }
    }
    return value;
  }

  /*
    CALC HELPER
    Calculates the given operations.
    Examples:
    calc`(${_`button.size.height`} * 2) + ${_`padding`}`
    calc`(${_`button.size.height`} * 2) + ${_`padding`}``px`
  */
  calc(pieces) {
    return (props) => {
      const run = (p) => {
        let result = pieces[0];
        let substitutions = [].slice.call(arguments, 1);
        let x = 0;
        for (let piece of substitutions) {
          x++;
          if (isFunction(piece)) {
            result += piece(p);
          }
          if (isNumber(piece)) {
            result += piece;
          }
          result += pieces[x];
        }
        // console.log(result);
        let response = "";
        try {
          response = new Function("return " + result)();
        } catch (e) {
          // eslint-disable-next-line
          console.warn("Invalid calculation", result);
        }

        return response;
      };
      return this.handlePropTypes(props, run);
    };
  }

  /*
    INTERNAL MATCH HELPER FOR OR, AND & COND OPERATOR
  */
  matchCondition(c) {
    const { operators } = this.props.options;
    let cond = c;
    if (isArray(cond)) cond = c[0];
    return (p) => {
      let matched;
      // run function if value is function
      if (isFunction(cond)) matched = cond(p);
      // check with is.set if value is string
      if (isString(cond)) {
        if (cond.includes(operators.nin)) {
          let [k, v] = cond.split(operators.nin);
          matched = this.is.nin(k, v)(p);
        } else if (cond.includes(operators.in)) {
          let [k, v] = cond.split(operators.in);
          matched = this.is.in(k, v)(p);
        } else if (cond.includes(operators.ne)) {
          let [k, v] = cond.split(operators.ne);
          matched = this.is.ne(k, v)(p);
        } else if (cond.includes(operators.eq)) {
          let [k, v] = cond.split(operators.eq);
          matched = this.is.eq(k, v)(p);
        } else if (cond.includes(operators.gt)) {
          let [k, v] = cond.split(operators.gt);
          matched = this.is.gt(k, v)(p);
        } else if (cond.includes(operators.gte)) {
          let [k, v] = cond.split(operators.gte);
          matched = this.is.gte(k, v)(p);
        } else if (cond.includes(operators.lt)) {
          let [k, v] = cond.split(operators.lt);
          matched = this.is.lt(k, v)(p);
        } else if (cond.includes(operators.lte)) {
          let [k, v] = cond.split(operators.lte);
          matched = this.is.lte(k, v)(p);
        } else if (cond.substr(0, operators.true.length) == operators.false) {
          let k = cond.replace(operators.false, "");
          matched = this.is.eq(k, false)(p);
        } else if (cond.substr(0, operators.true.length) == operators.true) {
          let k = cond.replace(operators.true, "");
          matched = this.is.eq(k, true)(p);
        } else if (cond.substr(0, operators.nset.length) == operators.nset) {
          let k = cond.replace(operators.nset, "");
          matched = this.is.nset(k)(p);
        } else {
          matched = this.is.set(cond)(p);
        }
      }
      return matched;
    };
  }

  /*
    IS HELPER FOR COND HELPER
    Checks given options.
    Examples:
    is.in("margin", "left")
    is.eq("active.size.key", "normal")
    is.set("props.$variant")
  */
  get is() {
    const g = (p, k) => {
      return this.style(k)(p);
    };
    return {
      // new methods
      nset: (k) => (p) => !g(p, k),
      set: (k) => (p) => g(p, k),
      in: (k, v) => (p) => {
        const val = g(p, k);
        return val && val.length && val.includes(v);
      },
      nin: (k, v) => (p) => {
        const val = g(p, k);
        return val && val.length && !val.includes(v);
      },
      eq: (k, v) => (p) => g(p, k) == v,
      ne: (k, v) => (p) => g(p, k) != v,
      lt: (k, v) => (p) => g(p, k) < v,
      lte: (k, v) => (p) => g(p, k) <= v,
      gt: (k, v) => (p) => g(p, k) > v,
      gte: (k, v) => (p) => g(p, k) >= v,
      color: (k) => (p) => isColor(g(p, k)),
    };
  }

  /*
    OR HELPER FOR COND HELPER
    Returns true if any given condition is true.
    Examples:
    or(is.eq("size","normal"),is.set("ghost"))
  */
  or(...conds) {
    return (p) => {
      let passed = false;
      if (conds && conds.length) {
        conds.forEach((cond) => {
          let matched = this.matchCondition(cond)(p);
          if (matched) {
            passed = true;
          }
        });
      }
      return passed;
    };
  }

  /*
    AND HELPER FOR COND HELPER
    Returns true if all given condition is true.
    Examples:
    and(is.eq("size","normal"),is.set("ghost"))
  */
  and(...conds) {
    return (p) => {
      let passed = true;
      if (conds && conds.length) {
        conds.forEach((cond) => {
          let matched = this.matchCondition(cond)(p);
          if (!matched) {
            passed = false;
          }
        });
      }
      return passed;
    };
  }

  /*
    CONDTION HELPER
    Resolves given conditions.
    Examples:
    cond({if: is.eq("$size", "micro"), then: "uppercase" , else: "none"})
    cond({if: (p) => {}, then:(p) => {}, else:(p) => {}})
    cond({if: "bg", then: _`theme.bg`, else: "none"})
  */
  cond(c) {
    return (p) => {
      let matched = this.matchCondition(c.if)(p);

      if (matched) {
        if (c.then) {
          if (isFunction(c.then)) {
            return c.then(p);
          } else {
            return c.then;
          }
        }
      } else {
        if (c.else) {
          if (isFunction(c.else)) {
            return c.else(p);
          } else {
            return c.else;
          }
        }
      }
    };
  }
}

export default ThemeMiner;
