class Base {
  constructor(methods = ['']) {
    ['index', 'new', 'create', 'show', 'edit', 'update', 'destroy'].concat(methods).forEach((m) => {
      this[m] = this[m] && this[m].bind(this);
    });
  }
}

module.exports = Base;
