import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.productSKU.findMany({
      include: { brand: true },
      orderBy: { name: "asc" },
    });
  }
  async findPublic() {
    const products = await this.findAll();
    return products.map(
      ({ basePricePerMt, taxPct, availableStockMt, ...product }) => product,
    );
  }
  getBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }
  async getBrandComparison() {
    return (await this.getBrands()).map((b) => ({
      brand: b.name,
      spec: b.complianceSpec,
      yieldStrength: b.yieldStrengthMinMpa,
      elongation: b.elongationMinPct,
      carbonEquiv: b.carbonEquivMax,
    }));
  }
  async updatePrice(id: string, price: number) {
    const result = await this.prisma.productSKU.updateMany({
      where: { id },
      data: { basePricePerMt: price },
    });
    if (!result.count) throw new NotFoundException("Product not found");
    return this.prisma.productSKU.findUnique({
      where: { id },
      include: { brand: true },
    });
  }
}
