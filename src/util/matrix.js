// use 3x3 matrices to represent affine transformations (uses homog. coords)
// based on my scuffed linear algebra knowledge lol

export const mat_identity = () => [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];

export const mat_zeroes = () => [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
];

export const mat_mul = (a, b) => [
    [a[0][0]*b[0][0] + a[0][1]*b[1][0] + a[0][2]*b[2][0], a[0][0]*b[0][1] + a[0][1]*b[1][1] + a[0][2]*b[2][1], a[0][0]*b[0][2] + a[0][1]*b[1][2] + a[0][2]*b[2][2]], 
    [a[1][0]*b[0][0] + a[1][1]*b[1][0] + a[1][2]*b[2][0], a[1][0]*b[0][1] + a[1][1]*b[1][1] + a[1][2]*b[2][1], a[1][0]*b[0][2] + a[1][1]*b[1][2] + a[1][2]*b[2][2]],
    [a[2][0]*b[0][0] + a[2][1]*b[1][0] + a[2][2]*b[2][0], a[2][0]*b[0][1] + a[2][1]*b[1][1] + a[2][2]*b[2][1], a[2][0]*b[0][2] + a[2][1]*b[1][2] + a[2][2]*b[2][2]]
];

export const dot = (v1, v2) => {
    let sum = 0;
    for(let i = 0; i < v1.length; i++){
        sum += v1[i] * v2[i];
    }
    return sum;
}

export const mat_apply = (a, v) => {
    const out = [];
    v = v.concat(1);
    for(let i = 0; i < a.length; i++){
        out.push(dot(a[i], v));
    }
    return [out[0], out[1]];
}

export const mat_compose = (...matrices) => {
    if(matrices.length === 0) matrices = [mat_identity()];
    let mat = matrices[matrices.length - 1];
    for(let i = matrices.length - 2; i >= 0; i--){
        mat = mat_mul(matrices[i], mat);
    }
    return mat;
}

export const mat_inverse = (m) => {
    let [
        [a, b, c],
        [d, e, f],
        [g, h, i]
    ] = m;
    let x = e * i - h * f,
        y = f * g - d * i,
        z = d * h - g * e,
        det = a * x + b * y + c * z;
    return det !== 0 ? [
        [x, c * h - b * i, b * f - c * e],
        [y, a * i - c * g, d * c - a * f],
        [z, g * b - a * h, a * e - d * b]
    ].map(r => r.map(v => v /= det)) : null;
}

export const mat_translate = (x, y) => [
    [1, 0, x],
    [0, 1, y],
    [0, 0, 1]
];

export const mat_scale = (sx, sy) => {
    if(sy === undefined) sy = sx;

    return [
        [sx, 0, 0],
        [0, sy, 0],
        [0, 0, 1]
    ];
}

export const mat_ccwrotate = (theta) => [
    [Math.cos(theta), -Math.sin(theta), 0],
    [Math.sin(theta), Math.cos(theta), 0],
    [0, 0, 1]
];