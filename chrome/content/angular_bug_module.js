FBL.ns(function () {
    with (FBL) {

        var DomProvider = require("firebug/dom/domProvider");
        var DomPanelTree = require("firebug/dom/domPanelTree");
        var DOMMemberProvider = require("firebug/dom/domMemberProvider");
        var Trace = require("firebug/lib/trace");
        var DOMBasePanel = require("firebug/dom/domBasePanel");
        var Events = require("firebug/lib/events");
        var FirebugReps = require("firebug/chrome/reps");
        var Obj = require("firebug/lib/object");
        var BasePanel = DOMBasePanel.prototype;
        var checked = {functions: false, privateProperties: false};

        function AngularBasePanel() {
        }

        AngularBasePanel.prototype = extend(BasePanel,
            {
                dispatchName: "AngularBasePanel",
                name: "AngularJS",
                title: "AngularJS Scope",
                parentPanel: "html",

                initialize: function () {
                    BasePanel.initialize.apply(this, arguments);

                    // Content rendering
                    this.provider = new DomProvider(this);
                    this.tree = new DomPanelTree(this.context, this.provider,
                        new DOMMemberProvider(this.context));
                },

                destroy: function (state) {
                    BasePanel.destroy.apply(this, arguments);

                    Trace.sysout("domSidePanel.destroy; scrollTop: " + this.panelNode.scrollTop);

                    // Save tree state
                    state.toggles = this.toggles;
                    this.tree.saveState(state.toggles);

                    this.tree.destroy();

                    // Save scroll position
                    state.scrollTop = this.panelNode.scrollTop;
                },

                getOptionsMenuItems: function (context) {
                    return [
                        {
                            label: "show private properties",
                            command: Obj.bindFixed(function () {
                                checked.privateProperties = !checked.privateProperties;
                                this.refresh();
                            }, this),
                            checked: checked.privateProperties
                        }, {
                            label: "show functions",
                            command: Obj.bindFixed(function () {
                                checked.functions = !checked.functions;
                                this.refresh();
                            }, this),
                            checked: checked.functions
                        }
                    ];
                },

                hide: function () {
                    BasePanel.hide.apply(this, arguments);
                },

                updateSelection: function (object) {
                    Trace.sysout("domSidePanel.updateSelection;");

                    var angular = XPCNativeWrapper.unwrap(this.context.window).angular;
                    if (angular) {
                        this.rebuild(false, this.scrollTop, this.toggles);   
                    } else {
                        FirebugReps.Warning.tag.replace({object: "NoMembersWarning"}, this.panelNode);
                    }
                },

                select: function(object, forceUpdate) {
                    this.realObject = object;
                    if (!object)
                        object = this.getDefaultSelection();

                    object = this.normalizeSelection(object);

                    if (Trace.active)
                    {
                        Trace.sysout("firebug.select " + this.name + " forceUpdate: " + forceUpdate + " " +
                            object + ((object == this.selection) ? "==" : "!=") + this.selection);
                    }

                    var angular = XPCNativeWrapper.unwrap(this.context.window).angular;
                    if (angular) {
                        object = this.filter(angular.element(object).scope());
                    }

                    if (forceUpdate || object != this.selection)
                    {
                        this.selection = object;
                        this.updateSelection(object);

                        Events.dispatch(Firebug.uiListeners, "onObjectSelected", [object, this]);
                    }
                },

                filter: function (object) {
                    var tmp = {};
                    for (var prop in object) {
                        if (!checked.functions && typeof object[prop] === 'function') {
                            continue;
                        }
                        if (!checked.privateProperties && prop.startsWith('$$')) {
                            continue;
                        }
                        tmp[prop] = object[prop];
                    }
                    return tmp;
                },

                refresh: function() {
                    var angular = XPCNativeWrapper.unwrap(this.context.window).angular;
                    if (angular) {
                        this.select(this.realObject, true);
                    } else {
                        FirebugReps.Warning.tag.replace({object: "NoMembersWarning"}, this.panelNode);
                    }
                },

                show: function (state) {
                    BasePanel.show.apply(this, arguments);

                    Trace.sysout("domSidePanel.show;", state);

                    if (state) {
                        if (state.toggles)
                            this.toggles = state.toggles;

                        if (state.scrollTop)
                            this.scrollTop = state.scrollTop;
                    }
                }
            }
        );
        Firebug.registerPanel(AngularBasePanel);
    }
});
