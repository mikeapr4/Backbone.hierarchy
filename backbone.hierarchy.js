/**
 * Backbone.Hierarchy
 * Version 0.1.0
 *
 * https://github.com/mikeapr4/Backbone.hierarchy
 */
(function(root, factory) {
  if (typeof exports === 'object' && typeof require === 'function') {
    module.exports = factory(require("backbone"), require("underscore"));
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["backbone", "underscore"], function(Backbone, _) {
      // Use global variables if the locals are undefined.
      return factory(Backbone || root.Backbone, _ || root._);
    });
  } else {
    factory(Backbone, _);
  }
}(this, function(Backbone, _) {

  'use strict';

  /**
   * Use with _.wrap to perform an action, assuming
   * the object is part of a hierarchy, and while
   * performing the action, temporarily
   * disable the hierarchy - it avoids sync'ing ping pong!
   */
  var relationalAction = function(fnc) {
    if (this.parent && !this.deactivateHierarchy) {
      this.deactivateHierarchy = true;
      // [fnc, arg2, arg3, ...] -> [arg2, arg3, ...]
      fnc.apply(this, Array.prototype.slice.call(arguments, 1));
      delete this.deactivateHierarchy;
    }
  };

  /**
   * Push array values into another array
   */
  var pushArray = function (a, b) {
    a.push.apply(a, b);
  };


  var original_Collection_constructor = Backbone.Collection.prototype.constructor;
  var original_Model_constructor = Backbone.Model.prototype.constructor;

  /**
   * @class Backbone.Collection
   */
  _.extend(Backbone.Collection.prototype, {

    bubblingChangeEvent: true,
    parent: null,

    constructor: function (models, options) {
      this.initialize = _.wrap(this.initialize, this.initializeRelated);
      original_Collection_constructor.call(this, models, options);
    },

    /**
     * Used in the constructor to prepend the hierarchical behaviour
     * @param models
     * @param options
     */
    initializeRelated: function(wrapped, models, options) {
      if (options && options.parent) {
        this.parent = options.parent;
        this.source = models || [];
        this.on('add remove change reset', this.syncUp, this);
        this.on('reset', this.syncModels, this);
        this.on('add', this.syncModel, this);
      }
      wrapped.call(this, models, options);
    },

    /**
     * Parent model has changed sync'd attribute directly
     * @param model
     * @param value
     */
    syncDown: _.wrap(function(model, value) {
      this.source = value;
      this.reset(value);
    }, relationalAction),

    /**
     * Collection has changed, parent model's sync'd.
     * Note, both objects share the same underlying
     * storage.
     */
    syncUp: _.wrap(function(opts) {
      var field = this.parent.getRelation(this);

      if (this.parent.get(field) !== this.source) {
        this.source = this.parent.get(field) || this.source;
        this.parent.attributes[field] = this.source;
      }
      this.source.length = 0;
      pushArray(this.source, this.toJSON());

      if (this.bubblingChangeEvent && (!opts || !opts.silent)) {
        this.parent.trigger('change:' + field, this.parent); // missing the last value here, add if needed
        this.parent.trigger('change', this.parent);
      }

    }, relationalAction),

    /**
     * When a collection is reset, all it's new
     * models will need parent references.
     * This is because "add" doesn't fire when
     * collections are reset.
     */
    syncModels: function() {
      this.each(this.syncModel, this);
    },

    /**
     * Any model added to the collection should
     * share the parent reference of the collection
     */
    syncModel: function(model) {
      if (!model.parent) {
        model.linkParent(this.parent);
      }
    }

  });


  /**
   * @class Backbone.Model
   */
  _.extend(Backbone.Model.prototype, {

    bubblingChangeEvent: true,
    parent             : null,
    related            : {}, // Attr -> DataType (Collection/Model) Map of Sub-entities of this model

    constructor: function (attributes, options) {
      this.initialize = _.wrap(this.initialize, this.initializeRelated);
      original_Model_constructor.apply(this, arguments);
    },

    linkParent: function(parent, attrs) {
      this.parent = parent;
      this.source = attrs || {};
      this.on('change', this.syncUp, this);
    },

    /**
     * Used in the constructor to prepend the hierarchical behaviour
     */
    initializeRelated: function(wrapped, attrs, options) {
      if (options && options.parent) {
        this.linkParent(options.parent, attrs);
      }
      _.each(this.related, this.animateRelatedAttr, this);

      wrapped.call(this, attrs, options);
    },

    /**
     * This method animates a related attribute value by wrapping it into a
     * fully synchronized Collection/Model
     *
     * @param DataType
     * @param attr
     */
    animateRelatedAttr: function(DataType, attr) {
      var child = new DataType(this.get(attr), _.extend({}, this.options || {}, {parent: this}));
      this[attr] = child;
      child.syncUp({silent: true}); // defaults might have been applied
      child.sync = function(method, model, options) {
        this.parent.save(null, _.omit(options, 'success', 'error'));
      }; // map child's sync func to parent save (for both model and collection)

      this.on('change:' + attr, child.syncDown, child);
    },

    syncDown: _.wrap(function(model, value) {
      this.source = value;
      this.set(value);
    }, relationalAction),

    syncUp: _.wrap(function(opts) {
      var field = this.parent.getRelation(this);

      // models can incorrectly inherit parent references from their collection
      if (field) {

        if (this.parent.get(field) !== this.source) {
          this.source = this.parent.get(field);
        }
        _.extend(this.source, this.attributes);
        if (this.bubblingChangeEvent && (!opts || !opts.silent)) {
          this.parent.trigger('change:' + field, this.parent); // missing the last value here, add if needed
          this.parent.trigger('change', this.parent);
        }
      }

    }, relationalAction),

    /**
     * Find the attribute key by looking for the
     * parent's reference to the entity (same name as attribute)
     * @param entity
     * @returns {*}
     */
    getRelation: function(entity) {
      var key = null;
      _.each(this, function(v, k) {
        if (v === entity) {
          key = k;
        }
      });
      return key;
    }

  });

  return Backbone;
}));