class Game < ActiveRecord::Base
  belongs_to :user
  has_many :living_cells, dependent: :destroy
end
