
const uuidv1 = require('uuid/v1');
const traverse = require('traverse');
const fs = require('fs');
const path = require('path');
const { ApolloServer, gql } = require('apollo-server');
const typeDefs = require('./schema');
const { applyPatch, compare } = require('fast-json-patch');

// The GraphQL schema
//const typeDefs = gql`
//  type Query {
//    "A simple type for getting started!"
//    hello: String
//  }
//`;

function calcLowerUpper(offset, first, len) {
  var lower = 0;
  if (offset !== undefined && offset > 0) {
    lower = Math.min(offset, len);
  }
  var upper = len;
  if (first !== undefined && first > 0) {
    upper = Math.min(lower + first, len);
  }
  return {lower, upper};
}

const availableNamespaces = [
  {
    Metadata: {
      Name: "app1_ns",
    },
    Status: {
      Phase: "Active"
    }
  },
  {
    Metadata: {
      Name: "app2_ns",
    },
    Status: {
      Phase: "Active"
    }
  }
];

const availableAddressPlans = [
  {
    Metadata: {
      Name: "standard-small-queue",
    },
    Spec: {
      AddressType: "queue",
      DisplayName: "Small Queue",
      DisplayOrder: 0,
      LongDescription: "Creates a small queue sharing underlying broker with other queues.",
      Resources: {
        "broker": 0.01,
        "router": 0.001
      },
      "shortDescription": "Creates a small queue sharing underlying broker with other queues."
    }
  },  {
    Metadata: {
      Name: "standard-medium-queue",
    },
    Spec: {
      AddressType: "queue",
      DisplayName: "Medium Queue",
      DisplayOrder: 1,
      LongDescription: "Creates a medium sized queue sharing underlying broker with other queues.",
      Resources: {
        "broker": 0.1,
        "router": 0.01
      },
      "shortDescription": "Creates a medium sized queue sharing underlying broker with other queues."
    }
  },  {
    Metadata: {
      Name: "standard-small-anycast",
    },
    Spec: {
      AddressType: "anycast",
      DisplayName: "Small Anycast",
      DisplayOrder: 0,
      LongDescription: "Creates a small anycast address where messages go via a router that does not take ownership of the messages.",
      Resources: {
        "router": 0.001
      },
      "shortDescription": "Creates a small anycast address."
    }
  },{
    Metadata: {
      Name: "standard-small-multicast",
    },
    Spec: {
      AddressType: "multicast",
      DisplayName: "Small Multicast",
      DisplayOrder: 0,
      LongDescription: "Creates a small multicast address where messages go via a router that does not take ownership of the messages.",
      Resources: {
        "router": 0.001
      },
      "shortDescription": "Creates a small multicast address."
    }
  },{
    Metadata: {
      Name: "brokered-queue",
    },
    Spec: {
      AddressType: "queue",
      DisplayName: "Brokered Queue",
      DisplayOrder: 0,
      LongDescription: "Creates a queue on a broker.",
      Resources: {
        "broker": 0
      },
      "shortDescription": "Creates a queue on a broker."
    }
  },{
    Metadata: {
      Name: "brokered-topic",
    },
    Spec: {
      AddressType: "topic",
      DisplayName: "Brokered Topic",
      DisplayOrder: 0,
      LongDescription: "Creates a topic on a broker.",
      Resources: {
        "broker": 0
      },
      "shortDescription": "Creates a topic on a broker."
    }
  }
];


const availableAddressSpacePlans = [
  {
    Metadata: {
      Name: "standard-small"
    },
    Spec: {
      AddressSpaceType: "standard",
      AddressPlans: availableAddressPlans.filter(p => !p.Metadata.Name.startsWith("brokered-")),
      DisplayName: "Small",
      ShortDescription: "Messaging infrastructure based on Apache Qpid Dispatch Router and Apache ActiveMQ Artemis",
      LongDescription: "Messaging infrastructure based on Apache Qpid Dispatch Router and Apache ActiveMQ Artemis. This plan allows up to 1 router and 1 broker in total, and is suitable for small applications using small address plans and few addresses.",
      DisplayOrder: 0,
      ResourceLimits: {
        aggregate: 2,
        broker: 1,
        router: 1
      }
    }
  },
  {
    Metadata: {
      Name: "standard-medium"
    },
    Spec: {
      AddressSpaceType: "standard",
      AddressPlans: availableAddressPlans.filter(p => !p.Metadata.Name.startsWith("brokered-")),
      DisplayName: "Medium",
      ShortDescription: "Messaging infrastructure based on Apache Qpid Dispatch Router and Apache ActiveMQ Artemis",
      LongDescription: "Messaging infrastructure based on Apache Qpid Dispatch Router and Apache ActiveMQ Artemis. This plan allows up to 3 routers and 3 broker in total, and is suitable for applications using small address plans and few addresses.",
      DisplayOrder: 1,
      ResourceLimits: {
        aggregate: 2.0,
        broker: 3.0,
        router: 3.0
      }
    }
  },
  {
    Metadata: {
      Name: "brokered-single-broker"
    },
    Spec: {
      AddressSpaceType: "brokered",
      AddressPlans: availableAddressPlans.filter(p => p.Metadata.Name.startsWith("brokered-")),
      DisplayName: "Single Broker",
      ShortDescription: "Single Broker instance",
      LongDescription: "Single Broker plan where you can create an infinite number of queues until the system falls over.",
      DisplayOrder: 0,
      ResourceLimits: {
        broker: 1.9,
      }
    }
  }
];

function getRandomCreationDate()
{
  return new Date(new Date().setDate(new Date().getDate() - Math.random() * 3));
}

function createAddressSpace(as) {
  var namespace = availableNamespaces.find(n => n.Metadata.Name === as.Metadata.Namespace);
  if (namespace === undefined) {
    var knownNamespaces = availableNamespaces.map(p => p.Metadata.Name);
    throw `Unrecognised namespace '${as.Metadata.Namespace}', known ones are : ${knownNamespaces}`;
  }

  var spacePlan = availableAddressSpacePlans.find(o => o.Metadata.Name === as.Spec.Plan);
  if (spacePlan === undefined) {
    var knownPlansNames = availableAddressSpacePlans.map(p => p.Metadata.Name);
    throw `Unrecognised address space plan '${as.Spec.Plan}', known ones are : ${knownPlansNames}`;
  }
  if (as.Spec.Type !== 'brokered' && as.Spec.Type !== 'standard') {
    throw `Unrecognised address space type '${(as.Spec.Type)}', known ones are : brokered, standard`;
  }

  if (addressSpaces.find(existing => as.Metadata.Name === existing.Metadata.Name && as.Metadata.Namespace === existing.Metadata.Namespace) !== undefined) {
    throw `Address space with name  '${as.Metadata.Name} already exists in namespace ${as.Metadata.Namespace}`;
  }

  var addressSpace = {
    Metadata: {
      Name: as.Metadata.Name,
      Namespace: namespace.Metadata.Name,
      Uid: uuidv1(),
      CreationTimestamp: getRandomCreationDate()
    },
    Spec: {
      Plan: spacePlan,
      Type: as.Spec.Type
    },
    Status: {
      "isReady": true,
      "messages": [],
      "phase": "Active"
    }
  };

  addressSpaces.push(addressSpace);
  return addressSpace;
}

function patchAddressSpace(metadata, jsonPatch, patchType) {
  var index = addressSpaces.findIndex(existing => metadata.Name === existing.Metadata.Name && metadata.Namespace === existing.Metadata.Namespace);
  if (index < 0) {
    throw `Address space with name  '${metadata.Name}' in namespace ${metadata.Namespace} does not exist`;
  }

  var knownPatchTypes = ["application/json-patch+json", "application/merge-patch+json", "application/strategic-merge-patch+json"];
  if (knownPatchTypes.find(p => p === patchType) === undefined) {
    throw `Unsupported patch type '$patchType'`
  } else if ( patchType !== 'application/json-patch+json') {
    throw `Unsupported patch type '$patchType', this mock currently supports only 'application/json-patch+json'`;
  }

  var patch = JSON.parse(jsonPatch);
  var current = addressSpaces[index];
  var patched = applyPatch(JSON.parse(JSON.stringify(current)) , patch);
  if (patched.newDocument) {
    var replacement = patched.newDocument;
    if (replacement.Metadata === undefined || replacement.Metadata.Name !== current.Metadata.Name || replacement.Metadata.Namespace !== current.Metadata.Namespace || replacement.Metadata.Uid !== current.Metadata.Uid) {
      throw `Immutable parts of resource (Address space '${metadata.Name}' in namespace ${metadata.Namespace}) cannot be patched.`
    }

    if (replacement.Spec.Plan !== current.Spec.Plan) {
      var replacementPlan = typeof(replacement.Spec.Plan) === "string" ? replacement.Spec.Plan : replacement.Spec.Plan.Metadata.Name;
      var spacePlan = availableAddressSpacePlans.find(o => o.Metadata.Name === replacementPlan);
      if (spacePlan === undefined) {
        var knownPlansNames = availableAddressSpacePlans.map(p => p.Metadata.Name);
        throw `Unrecognised address space plan '${replacement.Spec.Plan}', known ones are : ${knownPlansNames}`;
      }
      replacement.Spec.Plan = spacePlan;
    }

    addressSpaces[index] = replacement;
    return replacement;
  } else {
    throw `Failed to patch address space with name  '${metadata.Name}' in namespace ${metadata.Namespace}`
  }
}

function deleteAddressSpace(metadata) {
  var index = addressSpaces.findIndex(existing => metadata.Name === existing.Metadata.Name && metadata.Namespace === existing.Metadata.Namespace);
  if (index < 0) {
    throw `Address space with name  '${metadata.Name}' in namespace ${metadata.Namespace} does not exist`;
  }
  addressSpaces.splice(index, 1);
}


var addressSpaces = [];

createAddressSpace(
    {
      Metadata: {
        Name: "jupiter_as1",
        Namespace: availableNamespaces[0].Metadata.Name,
      },
      Spec: {
        Plan: "standard-small",
        Type: "standard"
      }
    });

createAddressSpace(
    {
      Metadata: {
        Name: "saturn_as2",
        Namespace: availableNamespaces[0].Metadata.Name,
      },
      Spec: {
        Plan: "standard-medium",
        Type: "standard"
      }
    });

createAddressSpace(
    {
      Metadata: {
        Name: "mars_as2",
        Namespace: availableNamespaces[1].Metadata.Name,
      },
      Spec: {
        Plan: "brokered-single-broker",
        Type: "brokered"
      }
    });


console.log("patch : %j", compare(addressSpaces[0], addressSpaces[1]));

var connections = [];

function createConnection(addressSpace, hostname) {
  return {
    AddressSpace: addressSpace,
    Hostname: hostname + ":" + (Math.floor(Math.random() * 25536) + 40000),
    ContainerId: uuidv1() + "",
    Protocol: "amqp",
    Properties: [],
    Metrics: []
  };
}

connections = connections.concat(["juno",
                                  "galileo",
                                  "ulysses",
                                  "cassini",
                                  "pioneer10",
                                  "pioneer11",
                                  "voyager1",
                                  "voyager2",
                                  "horizons",
                                  "clipper",
                                  "icy",
                                  "dragonfly",
                                  "kosmos",
                                  "mariner4",
                                  "mariner5",
                                  "zond2",
                                  "mariner6",
                                  "nozomi",
                                  "rosetta",
                                  "yinghuo1",
                                  "pathfinder"
].map(
    (n) => (
        createConnection(addressSpaces[0], n)
    )
));

connections = connections.concat(["dragonfly"].map(
    (n) => (
        createConnection(addressSpaces[1], n)
    )
));

connections = connections.concat(["kosmos",
                                  "mariner4",
                                  "mariner5",
                                  "zond2",
                                  "mariner6",
                                  "nozomi",
                                  "rosetta",
                                  "yinghuo1",
                                  "pathfinder"
].map(
    (n) => (
        createConnection(addressSpaces[2], n)
    )
));

var addressspace_connection = {};
addressSpaces.forEach(as => {
  addressspace_connection[as.Metadata.Uid] = connections.filter((c) => c.AddressSpace.Metadata.Uid === as.Metadata.Uid);
});

var addresses = [];

function createAddress(addr) {
  var namespace = availableNamespaces.find(n => n.Metadata.Name === addr.Metadata.Namespace);
  if (namespace === undefined) {
    var knownNamespaces = availableNamespaces.map(p => p.Metadata.Name);
    throw `Unrecognised namespace '${addr.Metadata.Namespace}', known ones are : ${knownNamespaces}`;
  }

  var addressSpacesInNamespace = addressSpaces.filter(as => as.Metadata.Namespace === addr.Metadata.Namespace);
  var addressSpace = addressSpacesInNamespace.find(as => as.Metadata.Name === addr.Spec.AddressSpace);
  if (addressSpace === undefined) {
    var addressspacenames = addressSpacesInNamespace.map(p => p.Metadata.Name);
    throw `Unrecognised address space '${addr.Spec.AddressSpace}', known ones are : ${addressspacenames}`;
  }

  var plan = availableAddressPlans.find(o => o.Metadata.Name === addr.Spec.Plan);
  if (plan === undefined) {
    var knownPlansNames = availableAddressPlans.map(p => p.Metadata.Name);
    throw `Unrecognised address plan '${addr.Spec.Plan}', known ones are : ${knownPlansNames}`;
  }

  var knownTypes = ['queue', 'topic', 'subscription', 'multicast', 'anycast'];
  if (knownTypes.find(t => t === addr.Spec.Type) === undefined) {
    throw `Unrecognised address type '${addr.Spec.Type}', known ones are : '${knownTypes}'`;
  }

  var prefix = addr.Spec.AddressSpace + ".";
  if (!addr.Metadata.Name.startsWith(prefix)) {
    throw `Address name must begin with '${prefix}`;
  }

  if (addresses.find(existing => addr.Metadata.Name === existing.Metadata.Name && addr.Metadata.Namespace === existing.Metadata.Namespace) !== undefined) {
    throw `Address with name  '${addr.Metadata.Name} already exists in address space ${addr.Spec.AddressSpace}`;
  }

  var address = {
    Metadata: {
      Name: addr.Metadata.Name,
      Namespace: addr.Metadata.Namespace,
      Uid: uuidv1(),
      CreationTimestamp: getRandomCreationDate()
    },
    Spec: {
      Address: addr.Spec.Address,
      Plan: plan,
      Type: addr.Spec.Type
    },
    Status: {
      Phase: "Active"
    }
  };
  addresses.push(address);
  return address;
}

function patchAddress(metadata, jsonPatch, patchType) {
  var index = addresses.findIndex(existing => metadata.Name === existing.Metadata.Name && metadata.Namespace === existing.Metadata.Namespace);
  if (index < 0) {
    throw `Address with name  '${metadata.Name}' in namespace ${metadata.Namespace} does not exist`;
  }

  var knownPatchTypes = ["application/json-patch+json", "application/merge-patch+json", "application/strategic-merge-patch+json"];
  if (knownPatchTypes.find(p => p === patchType) === undefined) {
    throw `Unsupported patch type '$patchType'`
  } else if ( patchType !== 'application/json-patch+json') {
    throw `Unsupported patch type '$patchType', this mock currently supports only 'application/json-patch+json'`;
  }

  var patch = JSON.parse(jsonPatch);
  var current = addresses[index];
  var patched = applyPatch(JSON.parse(JSON.stringify(current)) , patch);
  if (patched.newDocument) {
    var replacement = patched.newDocument;
    if (replacement.Metadata === undefined || replacement.Metadata.Name !== current.Metadata.Name || replacement.Metadata.Namespace !== current.Metadata.Namespace || replacement.Metadata.Uid !== current.Metadata.Uid) {
      throw `Immutable parts of resource (Address '${metadata.Name}' in namespace ${metadata.Namespace}) cannot be patched.`
    }

    if (replacement.Spec.Plan !== current.Spec.Plan) {
      var replacementPlan = typeof(replacement.Spec.Plan) === "string" ? replacement.Spec.Plan : replacement.Spec.Plan.Metadata.Name;
      var spacePlan = availableAddressPlans.find(o => o.Metadata.Name === replacementPlan);
      if (spacePlan === undefined) {
        var knownPlansNames = availableAddressPlans.map(p => p.Metadata.Name);
        throw `Unrecognised address plan '${replacement.Spec.Plan}', known ones are : ${knownPlansNames}`;
      }
      replacement.Spec.Plan = spacePlan;
    }

    addresses[index] = replacement;
    return replacement;
  } else {
    throw `Failed to patch address with name  '${metadata.Name}' in namespace ${metadata.Namespace}`
  }
}

function deleteAddress(metadata) {
  var index = addresses.findIndex(existing => metadata.Name === existing.Metadata.Name && metadata.Namespace === existing.Metadata.Namespace);
  if (index < 0) {
    throw `Address with name  '${metadata.Name}' in namespace ${metadata.Namespace} does not exist`;
  }
  addresses.splice(index, 1);
}

["ganymede", "callisto", "io", "europa", "amalthea", "himalia", "thebe", "elara", "pasiphae", "metis", "carme", "sinope"].map(n =>
    (createAddress({
      Metadata: {
        Name: addressSpaces[0].Metadata.Name + "." + n,
        Namespace: addressSpaces[0].Metadata.Namespace
      },
      Spec: {
        Address: n,
        AddressSpace: addressSpaces[0].Metadata.Name,
        Plan: "standard-small-queue",
        Type: "queue"
      }
    })));


["titan", "rhea", "iapetus", "dione", "tethys", "enceladus", "mimas"].map(n =>
    (createAddress({
      Metadata: {
        Name: addressSpaces[1].Metadata.Name + "." + n,
        Namespace: addressSpaces[1].Metadata.Namespace
      },
      Spec: {
        Address: n,
        AddressSpace: addressSpaces[1].Metadata.Name,
        Plan: "standard-small-queue",
        Type: "queue"
      }
    })));

["phobos", "deimous"].map(n =>
    (createAddress({
      Metadata: {
        Name: addressSpaces[2].Metadata.Name + "." + n,
        Namespace: addressSpaces[2].Metadata.Namespace
      },
      Spec: {
        Address: n,
        AddressSpace: addressSpaces[2].Metadata.Name,
        Plan: "brokered-queue",
        Type: "queue"
      }
    })));

function* makeAddrIter(namespace, addressspace) {
  var filter = addresses.filter(a => a.Metadata.Namespace === namespace && a.Metadata.Name.startsWith(addressspace + "."));
  var i = 0;
  while(filter.length) {
    var addr = filter[i++ % filter.length];
    yield addr;
  }
}

var addressItrs = {};
addressSpaces.forEach((as) => {
  addressItrs[as.Metadata.Uid] = makeAddrIter(as.Metadata.Namespace, as.Metadata.Name);
});

var links = [];
connections.forEach(c => {
  var addr = addressItrs[c.AddressSpace.Metadata.Uid].next().value;
  links.push(
      {
        Name: uuidv1(),
        Connection: c,
        Address: addr.Metadata.Name,
        Role: "sender",
      });
});

// A map of functions which return data for the schema.
const resolvers = {
  Mutation: {
    createAddressSpace: (parent, args) => {
      return createAddressSpace(args.input);
    },
    patchAddressSpace: (parent, args) => {
      return patchAddressSpace(args.input, args.jsonPatch, args.patchType);
    },
    deleteAddressSpace: (parent, args) => {
      deleteAddressSpace(args.input);
      return true;
    },
    createAddress: (parent, args) => {
      return createAddress(args.input);
    },
    patchAddress: (parent, args) => {
      return patchAddress(args.input, args.jsonPatch, args.patchType);
    },
    deleteAddress: (parent, args) => {
      deleteAddress(args.input);
      return true;
    },
  },
  Query: {
    hello: () => 'world',

    namespaces: () => availableNamespaces,

    addressTypes: () => (['queue', 'topic', 'subscription', 'multicast', 'anycast']),
    addressSpaceTypes: () => (['standard', 'brokered']),
    addressSpacePlans: (parent, args, context, info) => {
      return availableAddressSpacePlans
          .filter(o => args.addressSpaceType === undefined || o.Spec.AddressSpaceType === args.addressSpaceType)
          .sort(o => o.Spec.DisplayOrder);
    },
    addressPlans: (parent, args, context, info) => {
      if (args.addressSpacePlan === undefined) {
        return availableAddressPlans.sort(o => o.Spec.DisplayOrder);
      } else {
        var spacePlan = availableAddressSpacePlans.find(o => o.Metadata.Name === args.addressSpacePlan);
        if (spacePlan === undefined) {
          var knownPlansNames = availableAddressSpacePlans.map(p => p.Metadata.Name);
          throw `Unrecognised address space plan '${args.addressSpacePlan}', known ones are : ${knownPlansNames}`;
        }
        return spacePlan.Spec.AddressPlans.sort(o => o.Spec.DisplayOrder);
      }
    },
    addressSpaces:(parent, args, context, info) => {

      if (args.namespace !== undefined &&
          availableNamespaces.find(o => o.Metadata.Name === args.namespace) === undefined) {
        var knownNamespaces = availableNamespaces.map(p => p.Metadata.Name);
        throw `Unrecognised namespace '${args.namespace}', known ones are : ${knownNamespaces}`;
      }
      var as = addressSpaces.filter(as => args.namespace === undefined || args.namespace === as.Metadata.Namespace);
      var paginationBounds = calcLowerUpper(args.offset, args.first, as.length);
      var page = as.slice(paginationBounds.lower, paginationBounds.upper);

      return {
        Total: as.length,
        AddressSpaces: page.map(as => ({
          Resource: as,
          // Connections: getConnections(as),
          Metrics: []
        }))
      };
    },
    addresses:(parent, args, context, info) => {

      if (args.namespace !== undefined &&
          availableNamespaces.find(o => o.Metadata.Name === args.namespace) === undefined) {
        var known = availableNamespaces.map(p => p.Metadata.Name);
        throw `Unrecognised namespace '${args.namespace}', known ones are : ${known}`;
      }

      if (args.addressSpace !== undefined &&
          addressSpaces.find(as => as.Metadata.Namespace === args.namespace && as.Metadata.Name === args.addressSpace) === undefined) {
        var known = addressSpaces.filter(p => p.Metadata.Namespace === args.namespace).map(p => p.Metadata.Name);
        throw `Unrecognised address space '${args.addressSpace}' within '${args.namespace}', known ones are : ${known}`;
      }

      var a = addresses.filter(a => {
        return (args.namespace === undefined || args.namespace === a.Metadata.Namespace) && (
            args.addressSpace === undefined || (args.namespace && a.Metadata.Name.startsWith(args.addressSpace + ".")));
      });
      var paginationBounds = calcLowerUpper(args.offset, args.first, a.length);
      var page = a.slice(paginationBounds.lower, paginationBounds.upper);

      return {
        Total: a.length,
        Addresses: page.map(a => ({
          Resource: a,
          // Metrics: []
          // Connections provided by resolver
        }))
      };
    },
    connections:(parent, args, context, info) => {
      if (args.namespace !== undefined &&
          availableNamespaces.find(o => o.Metadata.Name === args.namespace) === undefined) {
        var known = availableNamespaces.map(p => p.Metadata.Name);
        throw `Unrecognised namespace '${args.namespace}', known ones are : ${known}`;
      }

      if (args.addressSpace !== undefined &&
          addressSpaces.find(as => as.Metadata.Namespace === args.namespace && as.Metadata.Name === args.addressSpace) === undefined) {
        var known = addressSpaces.filter(p => p.Metadata.Namespace === args.namespace).map(p => p.Metadata.Name);
        throw `Unrecognised address space '${args.addressSpace}' within '${args.namespace}', known ones are : ${known}`;
      }

      var cons;
      if (args.namespace === undefined && args.addressSpace === undefined) {
        cons = connections;
      } else {
        var uuids;
        if (args.addressSpace === undefined) {
          uuids = addressSpaces.filter(as => as.Metadata.Namespace === args.namespace)
              .map(as => as.Metadata.Uid);
        } else {
          uuids = addressSpaces.filter(
              as => as.Metadata.Namespace === args.namespace && as.Metadata.Name === args.addressSpace)
              .map(as => as.Metadata.Uid);
        }

        var keptCons = [];
        uuids.map(uuid => addressspace_connection[uuid]).forEach(c => {
          keptCons = keptCons.concat(c);
        });
        cons = connections.filter(c => keptCons.find(k => k === c));
      }

      var paginationBounds = calcLowerUpper(args.offset, args.first, cons.length);
      var page = cons.slice(paginationBounds.lower, paginationBounds.upper);

      return {
        Total: cons.length,
        Connections: page
      };

    }
  },

  AddressSpace: {
    Connections:(parent, args, context, info) => {
      var as = parent.Resource;
      var cons = as.Metadata.Uid in addressspace_connection ? addressspace_connection[as.Metadata.Uid] : [];
      var paginationBounds = calcLowerUpper(args.offset, args.first, cons.length);
      var page = cons.slice(paginationBounds.lower, paginationBounds.upper);
      return {Total: cons.length, Connections: page};
    },
    Metrics: (parent, args, context, info) => {
      var as = parent.Resource;
      var cons = as.Metadata.Uid in addressspace_connection ? addressspace_connection[as.Metadata.Uid] : [];
      var addrs = addresses.filter((a) => as.Metadata.Namespace === a.Metadata.Namespace &&
                                          a.Metadata.Name.startsWith(as.Metadata.Name + "."));

      return [
        {
          Name: "enmasse-connections",
          Type: "gauge",
          Value: cons.length,
          Units: "connections"
        },
        {
          Name: "enmasse-addresses",
          Type: "gauge",
          Value: addrs.length,
          Units: "addresses"
        },
      ];
    }

  },
  Address: {
    Metrics: (parent, args, context, info) => {
      var as = parent.Resource;
      var cons = as.Metadata.Uid in addressspace_connection ? addressspace_connection[as.Metadata.Uid] : [];
      var addrs = addresses.filter((a) => as.Metadata.Namespace === a.Metadata.Namespace &&
                                          a.Metadata.Name.startsWith(as.Metadata.Name + "."));

      return [
        {
          Name: "enmasse_messages_stored",
          Type: "gauge",
          Value: Math.floor(Math.random() * 10),
          Units: "messages"
        },
        {
          Name: "enmasse-senders",
          Type: "gauge",
          Value: Math.floor(Math.random() * 3),
          Units: "links"
        },
        {
          Name: "enmasse-receivers",
          Type: "gauge",
          Value: Math.floor(Math.random() * 3),
          Units: "links"
        },
        {
          Name: "enmasse_messages_in",
          Type: "rate",
          Value: Math.floor(Math.random() * 10),
          Units: "msg/s"
        },
        {
          Name: "enmasse_messages_out",
          Type: "gauge",
          Value: Math.floor(Math.random() * 10),
          Units: "msg/s"
        },

      ];
    },
    Links: (parent, args, context, info) => {
      var addr = parent.Resource;
      var addrlinks = links.filter((l) => l.Connection.AddressSpace.Metadata.Namespace === addr.Metadata.Namespace &&   addr.Metadata.Name.startsWith(l.Connection.AddressSpace.Metadata.Name + "."));

      var paginationBounds = calcLowerUpper(args.offset, args.first, addrlinks.length);
      var page = addrlinks.slice(paginationBounds.lower, paginationBounds.upper);

      return {
        Total: addrlinks.length,
        Links: page
      };
    },

  },
  Connection: {
    Links: (parent, args, context, info) => {
      var con = parent;
      var connlinks = links.filter((l) => l.Connection === con);

      var paginationBounds = calcLowerUpper(args.offset, args.first, connlinks.length);
      var page = connlinks.slice(paginationBounds.lower, paginationBounds.upper);

      return {
        Total: connlinks.length,
        Links: page
      };
    },
    Metrics: (parent, args, context, info) => {
      return [
        {
          Name: "enmasse_messages_in",
          Type: "rate",
          Value: Math.floor(Math.random() * 10),
          Units: "msg/s"
        },
        {
          Name: "enmasse_messages_out",
          Type: "gauge",
          Value: Math.floor(Math.random() * 10),
          Units: "msg/s"
        },
      ];
    }
  },
  Link: {
    Metrics: (parent, args, context, info) => {
      var nodes = traverse(info.path).nodes().filter(n => typeof(n) === "object");
      var is_addr_query = nodes.find(n =>  "key" in n && n["key"] === "Addresses") !== undefined;

      if (is_addr_query) {

        return [
          {
            Name: parent.Role === "sender" ? "enmasse_messages_in" : "enmasse_messages_out",
            Type: "rate",
            Value: Math.floor(Math.random() * 10),
            Units: "msg/s"
          },
          {
            Name: "enmasse_messages_backlog",
            Type: "gauge",
            Value: Math.floor(Math.random() * 15),
            Units: "msg"
          },
        ];
      } else {

        var as = parent.Connection.AddressSpace;
        if (as.Spec.Type === "brokered") {
          return [
            {
              Name: "enmasse_deliveries",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            }
          ];
        } else {
          return [
            {
              Name: "enmasse_deliveries",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
            {
              Name: "enmasse_rejected",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
            {
              Name: "enmasse_released",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
            {
              Name: "enmasse_modified",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
            {
              Name: "enmasse_presettled",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
            {
              Name: "enmasse_undelivered",
              Type: "counter",
              Value: Math.floor(Math.random() * 10),
              Units: "deliveries"
            },
          ];

        }
      }
    }

  }
};

const mocks = {
  Int: () => 6,
  Float: () => 22.1,
  String: () => 'Hello',
  User_v1: () => ({
    Identities: ['fred'],
    Groups: ['admin']
  }),
};


console.log(gql);
console.log(typeDefs);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks,
  mockEntireSchema: false,
  introspection: true,
  playground: true,
});


server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
