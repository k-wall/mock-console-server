const fs = require('fs')
const path = require('path')
const { ApolloServer, gql } = require('apollo-server');
const typeDefs = require('./schema');


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

var addressSpaces = [
  {
    Metadata: {
      Name: "jupiter_as1",
      Namespace: availableNamespaces[0].Metadata.Name,
    },
    Spec: {
      Plan: availableAddressSpacePlans.find(p => p.Metadata.Name === "standard-small"),
      Type: "standard"
    },
    Status: {
      "isReady": true,
      "messages": [],
      "phase": "Active"
    }
  },
  {
    Metadata: {
      Name: "saturn_as2",
      Namespace: availableNamespaces[0].Metadata.Name,
    },
    Spec: {
      Plan: availableAddressSpacePlans.find(p => p.Metadata.Name === "standard-medium"),
      Type: "standard"
    },
    Status: {
      "isReady": true,
      "messages": [],
      "phase": "Active"
    }
  },
  {
    Metadata: {
      Name: "mars_as3",
      Namespace: availableNamespaces[1].Metadata.Name,
    },
    Spec: {
      Plan: availableAddressSpacePlans.find(p => p.Metadata.Name === "brokered-queue"),
      Type: "brokered"
    },
    Status: {
      "isReady": true,
      "messages": [],
      "phase": "Active"
    }
  }
];

// A map of functions which return data for the schema.
const resolvers = {
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

      // console.log("addressSpaces %j", as);
      return {
        Total: as.length,
        AddressSpaces: page.map(as => ({
          Resource: as,
          Connections: [],
          Metrics: []
        }))
      };
    },

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
