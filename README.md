# Joe-v2 Subgraph

Subgraph for Joe-v2 (Liquidity Book) on AVAX C-chain.

### Subgraph Status

| network    | subgraph |
| ---------- | :------: | 
| avalanche  | https://thegraph.com/hosted-service/subgraph/traderjoe-xyz/joe-v2 |  
| arbitrum   | https://thegraph.com/hosted-service/subgraph/traderjoe-xyz/joe-v2-arbitrum |  
| fuji       | https://thegraph.com/hosted-service/subgraph/traderjoe-xyz/joe-v2-fuji |  
| arb-goerli | https://thegraph.com/hosted-service/subgraph/traderjoe-xyz/joe-v2-arb-goerli |  



### Setup & Deploy

````
# prepare constants and subgraph.yaml
$ yarn prepare:{network}

# generate Assembly Script typings
$ yarn codegen:{network}

# compile and build files
$ yarn build:{network}

# authenticate api key
$ graph auth

# deploy subgraph
$ yarn deploy:{network}
````

### Setting up local node (for development)
1. Install docker on local machine https://docs.docker.com/get-docker/)
2. Run `yarn start:node` 
3. Build subgraph: `yarn codegen && yarn build`
4. Create local subgraph: `yarn create-local`
5. Deploy to local node: `yarn deploy-local`
6. Subgraph endpoint available at http://localhost:8000/subgraphs/name/traderjoe-xyz/joe-v2-fuji
7. To open indexer logs: `docker logs joe_indexer -f 2>&1 | grep --line-buffered -i -E --color "WORD_TO_FILTER"`
8. To stop the running containers: `docker rm -f postgres ipfs joe_indexer`