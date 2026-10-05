import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("experts")
export class PublicExpertsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  list() {
    return this.prisma.expertAdvisor.findMany({
      where: { isPublished: true },
      orderBy: [{ serviceType: "asc" }, { name: "asc" }],
    });
  }
}
