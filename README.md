# Backbone.hierarchy
Connect and sync Collection/Model objects in a hierarchy matching their JSON structure.

## Complex Data

Backbone Models normally contain a set of primitive types.

    var order = new Backbone.Model({
        orderNo: 54,
        customerName: 'joe',
        customerSurname: 'bloggs',
        orderDate: '2000-01-01',
        ...
    });

But sooner or later, there is a need for more complex data:

    var order = new Backbone.Model({
        orderNo: 54,
        customer: {
            name: 'joe',
            surname: 'bloggs'
        }
        orderDate: '2000-01-01',
        items: [
            {
                productId: 45
                qty: 2
            }
        ]
    });

Above is a perfectly valid Model definition, however to add a line item, the Model object is circumvented. Normally writing to the model is done like this:

    order.set('orderDate', '2000-01-02');

But to add a line item:

    order.get('items').push({
        productId: 23,
        qty: 1
    });

This modification will not trigger any events.

## Using Backbone.hierarchy

    var Customer = Backbone.Model.extend({});
    var OrderLine = Backbone.Model.extend({

        // OO encapsulation on models
        addAnother: function() {
            this.set('qty', this.get('qty') + 1);
        }
    });
    var OrderLines = Backbone.Collection.extend({
        model: OrderLine
    });

Next model is defined with `related` definition, which maps a field name to a model or collection.

    var Order = Backbone.Model.extend({
        related: {
            customer: Customer,
            items: OrderLines
        }
    });

This model can be instantiated with complex data.

    var order = new Backbone.Model({
        orderNo: 54,
        customer: {
            name: 'joe',
            surname: 'bloggs'
        }
        orderDate: '2000-01-01',
        items: [
            {
                productId: 45
                qty: 2
            }
        ]
    });

At this point the `order` model can be accessed just as it was before:

    order.get('items')[0].qty
    order.get('customer').name

But it also provides an object hierarchy:

    order.items.first().get('qty');
    order.items.first().addAnother();
    order.customer.get('name');

The objects in this hierarchy will fire events, and also synchronize with the root model.

*See the [jasmine specs](https://github.com/mikeapr4/Backbone.hierarchy/blob/master/spec/spec.js) for more examples.*

## Alternatives

Backbone.hierarchy is designed to be small and loosely coupled. It is also more applicable when the server-side store is JSON, rather than a traditional relational database.

The following alternatives may suit some projects:

* [Backbone-relational](https://github.com/PaulUithol/Backbone-relational)
* [Supermodel](https://github.com/pathable/supermodel)
* [Backbone-Nested](https://github.com/afeld/backbone-nested)