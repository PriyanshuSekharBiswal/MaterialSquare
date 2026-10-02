/// <reference types="vite/client" />
import type LocomotiveScroll from "locomotive-scroll";
declare global {
  interface Window {
    __lenis?: LocomotiveScroll["lenisInstance"];
    __locomotiveScroll?: LocomotiveScroll;
  }
}
