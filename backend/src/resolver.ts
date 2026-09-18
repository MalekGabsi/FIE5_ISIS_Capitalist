import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier } from './graphql.js';
@Resolver('World')
export class GraphQlResolver {
constructor(private service: AppService) {}
@Query()
async getWorld(@Args('user') user: string) {
const world = this.service.readUserWorld(user);
return world;
}
}