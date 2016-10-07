var Backbone = require('../backbone.hierarchy.js'), _ = require('underscore');

describe('hierarchical models', function() {
  var cls = {}, json, hotels, hotel, rooms, room;
  var events, handler;

  beforeEach(function() {

    // Hierarchical Models
    // hotels -> hotel -> rooms -> room -> beds -> bed
    //           hotel -> reception

    cls.bed = Backbone.Model.extend({});
    cls.beds = Backbone.Collection.extend({
      model: cls.bed
    });
    cls.room = Backbone.Model.extend({
      related: {beds: cls.beds}
    });
    cls.rooms = Backbone.Collection.extend({
      model: cls.room
    });
    cls.reception = Backbone.Model.extend({});
    cls.hotel = Backbone.Model.extend({
      related: {rooms: cls.rooms, reception: cls.reception}
    });
    cls.hotels = Backbone.Collection.extend({
      model: cls.hotel
    });

    json = [
      {
        rooms: [
          {beds: [
            {type: 'queen'}
          ]},
          {beds: [
            {type: 'double'},
            {type: 'sofa'}
          ]}
        ]
      },
      {
        rooms    : [
          {
            beds: [
              {type: 'single'}
            ]
          }
        ],
        reception: {staff: 2}
      }
    ];
    hotels = new cls.hotels(json);
    hotel = hotels.at(0);
    rooms = hotel.rooms;
    room = rooms.at(1);

    events = [];
    handler = function() {
      events.push(Array.prototype.slice.call(arguments, 0, 2));
    };

  });

  it('and should create object structure for JSON', function() {

    expect(hotels.toJSON()).toEqual(json);
    expect(hotel.toJSON()).toEqual(json[0]);

    expect(hotel.get('rooms')).toEqual(json[0].rooms);
    expect(rooms.toJSON()).toEqual(json[0].rooms);

    expect(room.get('beds')).toEqual(json[0].rooms[1].beds);
    expect(room.beds.toJSON()).toEqual(json[0].rooms[1].beds);

    expect(room.beds.at(0).toJSON()).toEqual(json[0].rooms[1].beds[0]);

    expect(hotels.at(1).get('reception')).toEqual(json[1].reception);
    expect(hotels.at(1).reception.toJSON()).toEqual(json[1].reception);
  });

  it('and should share internal storage', function() {
    // Note: toBe not toEqual - Object reference equality
    expect(hotels.at(1).reception.source).toBe(hotels.at(1).get('reception'));
    expect(room.beds.source).toBe(room.get('beds'));
    expect(rooms.source).toBe(hotel.get('rooms'));

  });

  it('and should reflect changes in entities after JSON changes', function() {

    hotel.on('all', _.bind(handler, this, 'hotel'));
    room.on('all', _.bind(handler, this, 'room'));

    room.set('beds', [
      {type: 'double'}
    ]);

    var bedsJson = [
      {type: 'double'}
    ];

    expect(hotels.toJSON()[0].rooms[1].beds).toEqual(bedsJson);
    expect(hotel.get('rooms')[1].beds).toEqual(bedsJson);
    expect(rooms.toJSON()[1].beds).toEqual(bedsJson);
    expect(room.get('beds')).toEqual(bedsJson);
    expect(room.beds.toJSON()).toEqual(bedsJson);

    // Check parent references
    expect(room.beds.parent).toEqual(room);
    expect(room.beds.at(0).parent).toEqual(room);

    expect(events.length).toBe(4);
    expect(events[0]).toEqual(['room', 'change:beds']);
    expect(events[1]).toEqual(['hotel', 'change:rooms']);
    expect(events[2]).toEqual(['hotel', 'change']);
    expect(events[3]).toEqual(['room', 'change']);
  });

  it('and should reflect changes in entities after JSON changes', function() {

    expect(hotel.rooms.source).toBe(hotel.attributes.rooms);

    /**
     * Because the attributes haven't changed, no events are fired,
     * but the underlying memory references are different!
     */

    var changes = JSON.parse(JSON.stringify(hotel.toJSON()));
    hotel.set(changes);

    /**
     * Fix is that when the collection/model syncs up,
     * it will verify the sources have the same underlying
     * memory.
     */

    rooms.add({beds: [{type: 'queen'}]});

    expect(rooms.source).toBe(hotel.attributes.rooms);
  });

  it('and should reflect changes in JSON after collection entity changes', function() {

    hotel.on('all', _.bind(handler, this, 'hotel'));
    room.on('all', _.bind(handler, this, 'room'));

    room.beds.add({type: 'king'});

    var bedsJson = [
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king'}
    ];

    expect(hotels.toJSON()[0].rooms[1].beds).toEqual(bedsJson);
    expect(hotel.get('rooms')[1].beds).toEqual(bedsJson);
    expect(rooms.toJSON()[1].beds).toEqual(bedsJson);
    expect(room.get('beds')).toEqual(bedsJson);
    expect(room.beds.toJSON()).toEqual(bedsJson);

    expect(events.length).toBe(4);
    expect(events[0]).toEqual(['room', 'change:beds']);
    expect(events[1]).toEqual(['hotel', 'change:rooms']);
    expect(events[2]).toEqual(['hotel', 'change']);
    expect(events[3]).toEqual(['room', 'change']);
  });

  it('and should reflect changes in JSON after model entity changes', function() {

    hotel = hotels.at(1);
    var rec = hotel.reception;

    hotel.on('all', _.bind(handler, this, 'hotel'));
    rec.on('all', _.bind(handler, this, 'rec'));

    rec.set('staff', 5);

    var recJson = {staff: 5};

    expect(hotels.toJSON()[1].reception).toEqual(recJson);
    expect(hotel.get('reception')).toEqual(recJson);
    expect(rec.toJSON()).toEqual(recJson);
    expect(rec.get('staff')).toBe(5);

    expect(events.length).toBe(4);
    expect(events[0]).toEqual(['rec', 'change:staff']);
    expect(events[1]).toEqual(['hotel', 'change:reception']);
    expect(events[2]).toEqual(['hotel', 'change']);
    expect(events[3]).toEqual(['rec', 'change']);
  });

  it('and should reflect changes in JSON after collection entity reset', function() {

    hotel.on('all', _.bind(handler, this, 'hotel'));
    room.on('all', _.bind(handler, this, 'room'));

    room.beds.reset([
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king'}
    ]);

    var bedsJson = [
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king'}
    ];

    expect(hotels.toJSON()[0].rooms[1].beds).toEqual(bedsJson);
    expect(hotel.get('rooms')[1].beds).toEqual(bedsJson);
    expect(rooms.toJSON()[1].beds).toEqual(bedsJson);
    expect(room.get('beds')).toEqual(bedsJson);
    expect(room.beds.toJSON()).toEqual(bedsJson);

    expect(events.length).toBe(4);
    expect(events[0]).toEqual(['room', 'change:beds']);
    expect(events[1]).toEqual(['hotel', 'change:rooms']);
    expect(events[2]).toEqual(['hotel', 'change']);
    expect(events[3]).toEqual(['room', 'change']);
  });

  it('and should reflect changes in JSON after collection entity reset', function() {

    hotel.on('all', _.bind(handler, this, 'hotel'));
    room.on('all', _.bind(handler, this, 'room'));

    room.beds.reset([
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king'}
    ]);

    var bedsJson = [
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king'}
    ];

    expect(hotels.toJSON()[0].rooms[1].beds).toEqual(bedsJson);
    expect(hotel.get('rooms')[1].beds).toEqual(bedsJson);
    expect(rooms.toJSON()[1].beds).toEqual(bedsJson);
    expect(room.get('beds')).toEqual(bedsJson);
    expect(room.beds.toJSON()).toEqual(bedsJson);

    expect(events.length).toBe(4);
    expect(events[0]).toEqual(['room', 'change:beds']);
    expect(events[1]).toEqual(['hotel', 'change:rooms']);
    expect(events[2]).toEqual(['hotel', 'change']);
    expect(events[3]).toEqual(['room', 'change']);
  });

  it('and should save up the model', function() {

    var hotel2 = hotels.at(1);

    spyOn(hotel2, 'sync').and.returnValue(true);

    hotel2.reception.save(null, {});
    expect(hotel2.sync.calls.count()).toBe(1);

    hotel2.reception.save({staff: 5});
    expect(hotel2.sync.calls.count()).toBe(2);
    expect(hotel2.get('reception')).toEqual({staff: 5});

    hotel2.rooms.sync();
    expect(hotel2.sync.calls.count()).toBe(3);
  });

  it('added models should sync up the hierarchy also', function() {

    var model = new cls.bed({type: 'king'});
    room.beds.add(model); // should add the already instantiated model correctly to the hierarchy

    room.on('all', _.bind(handler, this, 'room'));

    model.set('type', 'king2');

    expect(rooms.toJSON()[1].beds).toEqual([
      {type: 'double'},
      {type: 'sofa'},
      {type: 'king2'}
    ]);

    expect(events.length).toBe(2);
    expect(events[0]).toEqual(['room', 'change:beds']);
    expect(events[1]).toEqual(['room', 'change']);
  });

});
