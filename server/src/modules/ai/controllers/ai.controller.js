import { ApiResponse } from "../../../utils/ApiResponse.js";
import { suggestComplaintCategory } from "../services/category-suggestion.service.js";

export const suggestCategory = async (req, res) => {
  const suggestion = await suggestComplaintCategory(req.validatedBody);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        suggestion,
        "Complaint category suggestion generated successfully",
      ),
    );
};
