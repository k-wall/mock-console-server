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

const availableAddressSpacePlans = [
  {
    ObjectMeta: {
      Name: "standard-small"
    },
    Spec: {
      AddressSpaceType: "standard",
      AddressPlans: [],
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
    ObjectMeta: {
      Name: "standard-medium"
    },
    Spec: {
      AddressSpaceType: "standard",
      AddressPlans: [],
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
    ObjectMeta: {
      Name: "brokered-single-broker"
    },
    Spec: {
      AddressSpaceType: "brokered",
      AddressPlans: [],
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

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',

    addressTypes: () => (['queue', 'topic', 'subscription', 'multicast', 'anycast']),
    addressSpaceTypes: () => (['standard', 'brokered']),
    addressSpacePlans: (parent, args, context, info) => {
      return availableAddressSpacePlans
          .filter(o => args.addressSpaceType === undefined || o.Spec.AddressSpaceType === args.addressSpaceType)
          .sort(o => o.Spec.DisplayOrder);
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
