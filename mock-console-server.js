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

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    // whoami: () => ({Identities: ["fred"]})
  }
};

const mocks = {
  Int: () => 6,
  Float: () => 22.1,
  String: () => 'Hello',
  User_v1: () => ({
    Identities: ['fred'],
    Groups: ['admin']
  })
};


console.log(gql);
console.log(typeDefs);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks,
  introspection: true,
  playground: true,
});


server.listen().then(({ url }) => {
  console.log(`? Server ready at ${url}`);
});
