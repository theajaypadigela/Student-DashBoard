import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum2(int[] c, int t) {
        List<List<Integer>>[][] ans = new ArrayList[c.length + 1][t + 1];

        // Initialize the DP table with empty lists
        for (int i = 0; i <= c.length; i++) {
            for (int j = 0; j <= t; j++) {
                ans[i][j] = new ArrayList<>();
            }
        }

        // Base case: There's one way to get sum = 0 (by choosing nothing)
        ans[0][0].add(new ArrayList<>());

        Arrays.sort(c); // Sorting helps in avoiding duplicate combinations

        for (int i = 1; i <= c.length; i++) {
            for (int j = 0; j <= t; j++) {
                // Exclude the current element
                ans[i][j].addAll(ans[i - 1][j]);

                // Include the current element if it's not greater than sum `j`
                if (c[i - 1] <= j) {
                    for (List<Integer> subset : ans[i - 1][j - c[i - 1]]) {
                        List<Integer> newSubset = new ArrayList<>(subset);
                        newSubset.add(c[i - 1]);
                        ans[i][j].add(newSubset);
                    }
                }
            }
        }

        return ans[c.length][t]; // Return all valid subsets for sum `t`
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        int[] c = {1, 2, 3};
        int t = 3;
        System.out.println(s.combinationSum2(c, t));
        
}
