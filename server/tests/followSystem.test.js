const { followUser, unfollowUser } = require('../controllers/followController');
const FollowModel = require('../models/followModel');

jest.mock('../models/followModel');

describe('User Follow/Unfollow API Network System Unit Tests', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    mockRequest = {
      user: { id: 10 }, // Authenticated User ID: 10
      params: { userId: '25' } // Target User ID: 25
    };

    mockResponse = {
      statusCode: 200,
      headers: {},
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.body = data; return this; }
    };

    jest.clearAllMocks();
  });

  test('should successfully establish follow linkages and return calculated count summaries', async () => {
    FollowModel.createFollow.mockResolvedValue(true);
    FollowModel.getFollowCounts.mockResolvedValue({ followersCount: 1, followingCount: 5 });

    await followUser(mockRequest, mockResponse);

    expect(mockResponse.statusCode).toBe(200);
    expect(mockResponse.body.data.followersCount).toBe(1);
    expect(FollowModel.createFollow).toHaveBeenCalledWith(10, 25);
  });

  test('should block attempts where self-follow conditions trigger', async () => {
    mockRequest.params.userId = '10'; // Matching authenticated identity ID

    await followUser(mockRequest, mockResponse);

    expect(mockResponse.statusCode).toBe(422);
    expect(mockResponse.body.error).toBe('Unprocessable Entity');
    expect(FollowModel.createFollow).not.toHaveBeenCalled();
  });

  test('should gracefully handle duplicate link conflicts with a 409 status code', async () => {
    FollowModel.createFollow.mockResolvedValue(false); // Model signals record already exists

    await followUser(mockRequest, mockResponse);

    expect(mockResponse.statusCode).toBe(409);
    expect(mockResponse.body.error).toBe('Conflict');
  });
});
