import { StaffGuard } from "../auth/access.guard";
import { validate } from "../common/validation";
import { z } from "zod";
import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getAllProducts() {
    return this.productsService.findPublic();
  }

  @Get("brands")
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get("brands/compare")
  getComparison() {
    return this.productsService.getBrandComparison();
  }

  @Get("inventory")
  @UseGuards(StaffGuard)
  inventory() {
    return this.productsService.findAll();
  }

  @Patch(":id/price")
  @UseGuards(StaffGuard)
  updatePrice(@Param("id") id: string, @Body("basePricePerMt") price: number) {
    return this.productsService.updatePrice(
      id,
      validate(z.number().finite().nonnegative(), price),
    );
  }
}
