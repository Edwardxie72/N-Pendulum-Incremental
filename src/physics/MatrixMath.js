export function solveLinearSystem(A, B) {
  const n = A.length;
  // Create an augmented matrix
  const mat = A.map((row, i) => [...row, B[i]]);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(mat[k][i]) > Math.abs(mat[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    const temp = mat[i];
    mat[i] = mat[maxRow];
    mat[maxRow] = temp;

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = mat[k][i] / mat[i][i];
      for (let j = i; j <= n; j++) {
        mat[k][j] -= factor * mat[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += mat[i][j] * x[j];
    }
    x[i] = (mat[i][n] - sum) / mat[i][i];
  }

  return x;
}
