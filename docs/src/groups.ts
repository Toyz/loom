/**
 * Docs — Route Groups
 *
 * Dogfooding Loom's @group decorator to organize the docs site routes.
 * Each section of the docs gets its own group with a shared prefix.
 */
import { group } from "@toyz/loom/router";

@group("/element")
export class ElementGroup {}

@group("/router")
export class RouterGroup {}

@group("/store")
export class StoreGroup {}

@group("/decorators")
export class DecoratorsGroup {}

@group("/di")
export class DIGroup {}
