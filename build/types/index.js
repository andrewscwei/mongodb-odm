"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = __importDefault(require("@sindresorhus/is"));
function typeIsUpdate(value) {
    if (!is_1.default.object(value))
        return false;
    return Object.keys(value).some(val => val.startsWith('$'));
}
exports.typeIsUpdate = typeIsUpdate;
function typeIsGeoCoordinate(value) {
    if (!is_1.default.array(value))
        return false;
    if (value.length !== 2)
        return false;
    if (!is_1.default.number(value[0]))
        return false;
    if (!is_1.default.number(value[1]))
        return false;
    const [longitude, latitude] = value;
    if (longitude < -180)
        throw new Error('Longitude value must not be less than -180 degrees');
    if (longitude > 180)
        throw new Error('Longitude value must not be greater than 180 degrees');
    if (latitude < -90)
        throw new Error('Longitude value must not be less than -90 degrees');
    if (latitude > 90)
        throw new Error('Longitude value must not be greater than 90 degrees');
    return true;
}
exports.typeIsGeoCoordinate = typeIsGeoCoordinate;
//# sourceMappingURL=index.js.map