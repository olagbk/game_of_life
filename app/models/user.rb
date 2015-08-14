class User < ActiveRecord::Base
  has_many :games
  has_many :login_tokens
  has_secure_password
end
