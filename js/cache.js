const AppCache = (() => {
  let data = null;

  function set(bootstrap) {
    data = bootstrap;
  }
  function get() {
    return data;
  }
  function user() {
    return data && data.user;
  }
  function modules() {
    return (data && data.modules) || CONFIG.modulesDefault;
  }
  function school() {
    return (data && data.school) || CONFIG.school;
  }
  function isModuleOn(key) {
    const m = modules();
    return m[key] !== false;
  }
  function classFees() {
    return (data && data.classFees) || CONFIG.classFees || {};
  }
  function subjectsByClass() {
    return (data && data.subjectsByClass) || CONFIG.subjectsByClass || {};
  }
  function clear() {
    data = null;
  }

  return { set, get, user, modules, school, isModuleOn, classFees, subjectsByClass, clear };
})();
